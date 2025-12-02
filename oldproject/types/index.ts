export type Role = 'ADMIN' | 'STAFF' | 'MANAGER'
export type Status = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'RETURNED' | 'PROBLEM'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface User {
  id: string
  username: string
  name: string
  role: Role
  departmentId: string | null
  department?: Department
  createdAt: string
  updatedAt: string
}

export interface Department {
  id: string
  name: string
  users?: User[]
  checkpoints?: Checkpoint[]
  templateCheckpoints?: TemplateCheckpoint[]
}

export interface WorkOrder {
  id: string
  company: string
  title: string
  description?: string
  priority: Priority
  createdById: string
  createdBy?: User
  createdAt: string
  deadline?: string
  checkpoints?: Checkpoint[]
  attachments?: WorkAttachment[]
  workComments?: Comment[]
}

export interface Checkpoint {
  id: string
  workId: string
  work?: WorkOrder
  order: number
  name: string
  ownerDeptId: string
  ownerDept: Department
  status: Status
  startedAt?: string
  endedAt?: string
  comments?: Comment[]
}

export interface Comment {
  id: string
  checkpointId?: string | null
  checkpoint?: Checkpoint
  workId?: string | null
  work?: WorkOrder
  userId: string
  user: User
  message?: string
  fileUrl?: string
  parentId?: string | null
  parent?: Comment
  replies?: Comment[]
  mentionedUserIds?: string[]
  mentionedUsers?: User[]
  createdAt: string
}

export interface WorkAttachment {
  id: string
  workId: string
  work?: WorkOrder
  url: string
  uploadedById: string
  uploadedBy?: User
  createdAt: string
}

export interface ActivityLog {
  id: string
  userId: string
  user?: User
  action: string
  details?: string
  createdAt: string
}

export interface Template {
  id: string
  name: string
  checkpoints?: TemplateCheckpoint[]
}

export interface TemplateCheckpoint {
  id: string
  templateId: string
  template?: Template
  order: number
  name: string
  ownerDeptId: string
  ownerDept: Department
}

