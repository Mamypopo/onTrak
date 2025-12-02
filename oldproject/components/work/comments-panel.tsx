'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { Comment, Checkpoint, WorkOrder, User as UserType } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { 
  Send, 
  Paperclip, 
  User, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle, 
  RotateCcw,
  Smile,
  Image as ImageIcon,
  FileText,
  X,
  Reply,
  AtSign,
  Loader2
} from 'lucide-react'
import { useSocket } from '@/lib/socket-client'
import { cn } from '@/lib/utils'

interface CommentsPanelProps {
  checkpoint: Checkpoint | null
  workId: string
  workOrder?: WorkOrder | null
}

const statusConfig = {
  PENDING: { 
    icon: Clock, 
    color: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
    label: 'รอดำเนินการ' 
  },
  PROCESSING: { 
    icon: TrendingUp, 
    color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    label: 'กำลังดำเนินการ' 
  },
  COMPLETED: { 
    icon: CheckCircle2, 
    color: 'bg-green-500/20 text-green-600 dark:text-green-400',
    label: 'เสร็จสิ้น' 
  },
  RETURNED: { 
    icon: RotateCcw, 
    color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    label: 'ส่งกลับ' 
  },
  PROBLEM: { 
    icon: AlertTriangle, 
    color: 'bg-red-500/20 text-red-600 dark:text-red-400',
    label: 'มีปัญหา' 
  },
}

export function CommentsPanel({ checkpoint, workId, workOrder }: CommentsPanelProps) {
  const { theme, resolvedTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'work' | 'checkpoint'>('work')
  const [workComments, setWorkComments] = useState<Comment[]>([])
  const [checkpointComments, setCheckpointComments] = useState<Comment[]>([])
  const [message, setMessage] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [pendingCommentIds, setPendingCommentIds] = useState<Set<string>>(new Set())
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null)
  const [users, setUsers] = useState<UserType[]>([])
  const [mentionQuery, setMentionQuery] = useState('')
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [mentionPosition, setMentionPosition] = useState({ start: 0, end: 0 })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const socket = useSocket()
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchWorkComments = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/comment?workId=${workId}`)
      const data = await res.json()
      if (data.comments) {
        setWorkComments(data.comments)
      }
    } finally {
      setIsLoading(false)
    }
  }, [workId])

  const fetchCheckpointComments = useCallback(async () => {
    if (!checkpoint) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/comment?checkpointId=${checkpoint.id}`)
      const data = await res.json()
      if (data.comments) {
        setCheckpointComments(data.comments)
      }
    } finally {
      setIsLoading(false)
    }
  }, [checkpoint])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/user')
      if (!res.ok) {
        console.error('Failed to fetch users:', res.status)
        return
      }
      const data = await res.json()
      if (data.users) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    if (activeTab === 'work') {
      fetchWorkComments()
    } else if (checkpoint) {
      fetchCheckpointComments()
    }
  }, [activeTab, checkpoint, fetchWorkComments, fetchCheckpointComments])

  // Memoized event handler to prevent unnecessary re-renders
  const handleCommentNew = useCallback((newComment: Comment) => {
    // ข้าม comment ที่เรากำลังส่งอยู่ (จะเพิ่มจาก handleSubmit แล้ว)
    if (pendingCommentIds.has(newComment.id)) {
      setPendingCommentIds((prev) => {
        const next = new Set(prev)
        next.delete(newComment.id)
        return next
      })
      return
    }

    // Helper function to add comment to list (handles replies)
    const addCommentToList = (comments: Comment[], comment: Comment): Comment[] => {
      // ตรวจสอบว่า comment นี้มีอยู่แล้วหรือไม่ (ป้องกันการซ้ำ)
      if (comments.some(c => c.id === comment.id)) {
        return comments
      }

      // If it's a reply, add to parent's replies
      if (comment.parentId) {
        return comments.map(c => {
          if (c.id === comment.parentId) {
            return {
              ...c,
              replies: [...(c.replies || []), comment]
            }
          }
          // Recursively check replies
          if (c.replies && c.replies.length > 0) {
            return {
              ...c,
              replies: addCommentToList(c.replies, comment)
            }
          }
          return c
        })
      }

      // Top-level comment
      return [...comments, comment]
    }

    if (newComment.workId === workId && !newComment.checkpointId) {
      setWorkComments((prev) => addCommentToList(prev, newComment))
    } else if (newComment.checkpointId === checkpoint?.id) {
      setCheckpointComments((prev) => addCommentToList(prev, newComment))
    }
  }, [workId, checkpoint?.id, pendingCommentIds])

  useEffect(() => {
    if (socket && workId) {
      // Don't join room here - parent component (WorkDetailClient) already joined
      // Just listen to events
      socket.on('comment:new', handleCommentNew)

      return () => {
        socket.off('comment:new', handleCommentNew)
        // Don't leave room here - parent component will handle it
      }
    }
  }, [socket, workId, handleCommentNew])

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [workComments, checkpointComments])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  // Extract mentions from message (@username)
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g
    const matches = text.match(mentionRegex)
    if (!matches) return []
    
    return matches.map(match => {
      const username = match.substring(1) // Remove @
      const user = users.find(u => u.username === username)
      return user?.id || ''
    }).filter(id => id !== '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const isWorkComment = activeTab === 'work'
    
    if ((!message.trim() && !file) || isSubmitting) return

    setIsSubmitting(true)

    const formData = new FormData()
    if (isWorkComment) {
      formData.append('workId', workId)
    } else if (checkpoint) {
      formData.append('checkpointId', checkpoint.id)
    }
    
    if (message.trim()) {
      formData.append('message', message)
      // Extract and add mentions
      const mentionedUserIds = extractMentions(message)
      if (mentionedUserIds.length > 0) {
        formData.append('mentionedUserIds', JSON.stringify(mentionedUserIds))
      }
    }
    if (file) {
      formData.append('file', file)
    }
    if (replyingTo) {
      formData.append('parentId', replyingTo.id)
    }

    try {
      const res = await fetch('/api/comment', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        const newComment = data.comment
        
        // เพิ่ม comment ID เข้า pending set เพื่อป้องกันการซ้ำจาก socket event
        setPendingCommentIds((prev) => new Set(prev).add(newComment.id))
        
        // เพิ่ม comment เข้า state
        if (isWorkComment) {
          setWorkComments((prev) => {
            // ตรวจสอบว่า comment นี้มีอยู่แล้วหรือไม่ (ป้องกันการซ้ำ)
            if (prev.some(comment => comment.id === newComment.id)) {
              return prev
            }
            return [...prev, newComment]
          })
        } else {
          setCheckpointComments((prev) => {
            // ตรวจสอบว่า comment นี้มีอยู่แล้วหรือไม่ (ป้องกันการซ้ำ)
            if (prev.some(comment => comment.id === newComment.id)) {
              return prev
            }
            return [...prev, newComment]
          })
        }
        
        setMessage('')
        setFile(null)
        setFileName('')
        setReplyingTo(null)
        setShowMentionSuggestions(false)
        
        // ไม่ต้อง emit socket event กลับไป เพราะ server จะ broadcast ให้เอง
        // handleCommentNew จะข้าม comment นี้เพราะอยู่ใน pendingCommentIds
      }
    } catch (error) {
      console.error('Error posting comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setFileName(selectedFile.name)
    }
  }

  const removeFile = () => {
    setFile(null)
    setFileName('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((prev) => prev + emojiData.emoji)
    textareaRef.current?.focus()
  }

  const handleReplyClick = (comment: Comment) => {
    setReplyingTo(comment)
    setMessage(`@${comment.user.username} `)
    textareaRef.current?.focus()
  }

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setMessage(value)
    
    // Check for @ mention
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = value.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      // Check if there's no space after @ (meaning we're typing a mention)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionQuery(textAfterAt)
        setShowMentionSuggestions(true)
        setMentionPosition({ start: lastAtIndex, end: cursorPos })
      } else {
        setShowMentionSuggestions(false)
      }
    } else {
      setShowMentionSuggestions(false)
    }
  }

  const insertMention = (user: UserType) => {
    if (!textareaRef.current) return
    
    const beforeMention = message.substring(0, mentionPosition.start)
    const afterMention = message.substring(mentionPosition.end)
    const newMessage = `${beforeMention}@${user.username} ${afterMention}`
    
    setMessage(newMessage)
    setShowMentionSuggestions(false)
    
    // Focus and set cursor position
    setTimeout(() => {
      textareaRef.current?.focus()
      const newCursorPos = mentionPosition.start + user.username.length + 2 // @ + username + space
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    user.name.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 5)

  const renderComment = (comment: Comment, isReply = false) => {
    // Highlight mentions in message
    const renderMessage = (text: string) => {
      if (!text) return null
      const parts = text.split(/(@\w+)/g)
      return parts.map((part, i) => {
        if (part.startsWith('@')) {
          const username = part.substring(1)
          const user = users.find(u => u.username === username)
          return (
            <span key={i} className="text-primary font-medium">
              {part}
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })
    }

    return (
      <div key={comment.id} className={cn(
        "flex gap-2 sm:gap-3 group hover:bg-muted/30 rounded-xl p-2 sm:p-3 -mx-2 sm:-mx-3 transition-colors",
        isReply && "ml-4 sm:ml-8 border-l-2 border-primary/20 pl-2 sm:pl-4"
      )}>
        <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 ring-2 ring-background shadow-sm">
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1.5 sm:space-y-2.5 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="font-semibold text-xs sm:text-sm text-foreground">{comment.user.name}</span>
            {comment.checkpoint && (
              <Badge variant="outline" className="text-[10px] sm:text-xs border-primary/20 bg-primary/5 text-primary px-1 sm:px-1.5">
                {comment.checkpoint.name}
              </Badge>
            )}
            {comment.parent && (
              <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-0.5 sm:gap-1">
                <Reply className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span className="hidden sm:inline">ตอบกลับ {comment.parent.user.name}</span>
                <span className="sm:hidden">ตอบ</span>
              </span>
            )}
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {format(new Date(comment.createdAt), 'dd MMM yyyy HH:mm', { locale: th })}
            </span>
          </div>
          {comment.message && (
            <div className="bg-gradient-to-br from-muted/60 to-muted/40 rounded-2xl rounded-tl-sm px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm leading-relaxed break-words border border-border/50 shadow-sm">
              {renderMessage(comment.message)}
            </div>
          )}
          {comment.fileUrl && (() => {
            const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(comment.fileUrl)
            
            if (isImage) {
              return (
                <div className="mt-2">
                  <a
                    href={comment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                  >
                    <img
                      src={comment.fileUrl}
                      alt="รูปภาพแนบ"
                      className="max-w-[200px] sm:max-w-[250px] rounded-lg border border-border/50 shadow-sm hover:shadow-md transition-all group-hover:scale-105 object-cover"
                      onError={(e) => {
                        // Fallback to file link if image fails to load
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = `
                            <a href="${comment.fileUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-primary hover:text-primary/80 p-2 sm:p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 border border-primary/20 hover:border-primary/30 transition-all shadow-sm hover:shadow-md">
                              <svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                              <span class="font-medium">ไฟล์แนบ</span>
                            </a>
                          `
                        }
                      }}
                    />
                  </a>
                </div>
              )
            }
            
            return (
              <a
                href={comment.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-primary hover:text-primary/80 p-2 sm:p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 border border-primary/20 hover:border-primary/30 transition-all shadow-sm hover:shadow-md"
              >
                <Paperclip className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="font-medium">ไฟล์แนบ</span>
              </a>
            )
          })()}
          {!isReply && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReplyClick(comment)}
              className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs text-muted-foreground hover:text-primary mt-1"
            >
              <Reply className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 sm:mr-1.5" />
              ตอบกลับ
            </Button>
          )}
          {comment.replies && comment.replies.length > 0 && (
            <div className="space-y-1.5 sm:space-y-2 mt-1.5 sm:mt-2">
              {comment.replies.map((reply) => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderComments = (comments: Comment[]) => {
    if (comments.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">
            ยังไม่มีคอมเมนต์
          </p>
          <p className="text-xs text-muted-foreground/80">
            เป็นคนแรกที่คอมเมนต์{activeTab === 'work' ? 'ในงานนี้' : 'ใน checkpoint นี้'}
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {comments.map((comment) => renderComment(comment))}
        <div ref={commentsEndRef} />
      </div>
    )
  }

  return (
    <div className="h-full md:h-full flex flex-col md:overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shrink-0">
        <div className="container mx-auto max-w-3xl px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'work' | 'checkpoint')}>
            <TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-1.5 sm:gap-2">
              <TabsTrigger 
                value="work" 
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm"
              >
                <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">คอมเมนต์งาน</span>
                <span className="sm:hidden">งาน</span>
              </TabsTrigger>
              <TabsTrigger 
                value="checkpoint" 
                disabled={!checkpoint}
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 disabled:opacity-50 text-xs sm:text-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">คอมเมนต์ Checkpoint</span>
                <span className="sm:hidden">Checkpoint</span>
                {checkpoint && (
                  <Badge variant="outline" className="ml-1 sm:ml-2 text-[10px] sm:text-xs hidden sm:inline-flex">
                    {checkpoint.name}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="container mx-auto max-w-3xl px-3 sm:px-4 md:px-6 py-4 sm:py-6">
          {isLoading ? (
            <div className="space-y-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Skeleton className="h-4 w-24 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                    <Skeleton className="h-16 w-full rounded-2xl rounded-tl-sm" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'work' ? (
            renderComments(workComments)
          ) : checkpoint ? (
            renderComments(checkpointComments)
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  เลือก checkpoint เพื่อดูคอมเมนต์
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modern Input - Enhanced Design */}
      <div className="border-t border-border/50 bg-card/80 backdrop-blur-sm sticky bottom-0 z-10 shrink-0">
        <div className="container mx-auto max-w-3xl px-4 md:px-6 py-3 md:py-4">
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {/* File Preview */}
            {file && (
              <div className="flex items-center gap-2 p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                <Paperclip className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs flex-1 truncate text-foreground">{fileName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="h-6 w-6 p-0 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Input Container */}
            <div className={cn(
              "relative flex items-end gap-2 p-2.5 rounded-xl border transition-all duration-200",
              isFocused 
                ? "border-primary/50 bg-background shadow-md ring-1 ring-primary/20" 
                : "border-border/50 bg-muted/30 hover:border-border hover:bg-muted/40"
            )}>
              {/* File Upload Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 w-8 p-0 shrink-0 rounded-lg hover:bg-primary/10 transition-colors"
              >
                <Paperclip className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Textarea */}
              <div className="flex-1 relative min-w-0">
                {replyingTo && (
                  <div className="mb-2 p-2 bg-primary/5 border border-primary/20 rounded-lg text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-primary flex items-center gap-1.5">
                        <Reply className="h-3 w-3" />
                        ตอบกลับ {replyingTo.user.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReplyingTo(null)
                          setMessage('')
                        }}
                        className="h-5 w-5 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleMessageChange}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => {
                    setIsFocused(false)
                    // Delay hiding suggestions to allow clicking on them
                    setTimeout(() => setShowMentionSuggestions(false), 200)
                  }}
                  placeholder={activeTab === 'work' ? 'เขียนคอมเมนต์ในงาน...' : 'เขียนคอมเมนต์ใน checkpoint...'}
                  className="w-full resize-none bg-transparent border-0 focus:outline-none text-sm placeholder:text-muted-foreground/60 max-h-[120px] overflow-y-auto leading-relaxed"
                  rows={1}
                />
                {/* Mention Suggestions */}
                {showMentionSuggestions && filteredUsers.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => insertMention(user)}
                        className="w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-2 text-sm"
                      >
                        <AtSign className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{user.name}</div>
                          <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Emoji Picker & Send Button */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg hover:bg-primary/10 transition-colors"
                    >
                      <Smile className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground hover:text-primary transition-colors" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-auto p-0 border-0 shadow-lg z-50"
                    side="top"
                    align="end"
                    sideOffset={8}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      width={350}
                      height={400}
                      theme={(resolvedTheme || theme || 'light') as Theme}
                      previewConfig={{ showPreview: false }}
                      skinTonesDisabled
                      searchDisabled={false}
                      lazyLoadEmojis
                    />
                  </PopoverContent>
                </Popover>
                
                {(message.trim() || file) && (
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting}
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
