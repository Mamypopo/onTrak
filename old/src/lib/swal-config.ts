'use client'

import Swal from 'sweetalert2'

// Initialize SweetAlert2 with dark mode support
if (typeof window !== 'undefined') {
  // Add custom CSS for dark mode support
  const styleId = 'swal2-dark-mode-styles'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      /* SweetAlert2 Dark Mode Support */
      .swal2-popup {
        background: hsl(var(--card)) !important;
        color: hsl(var(--foreground)) !important;
        border: 1px solid hsl(var(--border)) !important;
      }
      
      .swal2-title {
        color: hsl(var(--foreground)) !important;
      }
      
      .swal2-content {
        color: hsl(var(--muted-foreground)) !important;
      }
      
      .swal2-html-container {
        color: hsl(var(--muted-foreground)) !important;
      }
      
      .swal2-confirm {
        background-color: hsl(var(--primary)) !important;
        border-color: hsl(var(--primary)) !important;
        color: hsl(var(--primary-foreground)) !important;
      }
      
      .swal2-confirm:hover {
        background-color: hsl(var(--primary)) !important;
        opacity: 0.9;
      }
      
      .swal2-cancel {
        background-color: transparent !important;
        border: 1px solid hsl(var(--border)) !important;
        border-color: hsl(var(--border)) !important;
        color: hsl(var(--foreground)) !important;
        font-weight: 500 !important;
      }
      
      .swal2-cancel:hover {
        background-color: hsl(var(--muted)) !important;
        border-color: hsl(var(--muted-foreground)) !important;
        color: hsl(var(--foreground)) !important;
      }
      
      .swal2-cancel:focus {
        box-shadow: 0 0 0 3px hsl(var(--ring) / 0.2) !important;
      }
      
      .swal2-toast {
        background: hsl(var(--card)) !important;
        color: hsl(var(--foreground)) !important;
        border: 1px solid hsl(var(--border)) !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
      }
      
      .swal2-toast .swal2-title {
        color: hsl(var(--foreground)) !important;
      }
      
      .swal2-toast .swal2-content {
        color: hsl(var(--muted-foreground)) !important;
      }
      
      .swal2-icon.swal2-success {
        border-color: hsl(var(--success)) !important;
        color: hsl(var(--success)) !important;
      }
      
      .swal2-icon.swal2-error {
        border-color: hsl(var(--error)) !important;
        color: hsl(var(--error)) !important;
      }
      
      .swal2-icon.swal2-warning {
        border-color: hsl(var(--warning)) !important;
        color: hsl(var(--warning)) !important;
      }
      
      .swal2-icon.swal2-info {
        border-color: hsl(var(--secondary)) !important;
        color: hsl(var(--secondary)) !important;
      }
      
      .swal2-icon.swal2-question {
        border-color: hsl(var(--secondary)) !important;
        color: hsl(var(--secondary)) !important;
      }
      
      .swal2-progress-bar {
        background: hsl(var(--primary)) !important;
      }
      
      .swal2-loader {
        border-color: hsl(var(--primary)) transparent hsl(var(--primary)) transparent !important;
      }
      
      /* Kitchen Order Notification Styles */
      .swal2-popup-kitchen {
        background: hsl(var(--card)) !important;
        border: 2px solid hsl(var(--primary)) !important;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
        border-radius: 12px !important;
        padding: 1.5rem !important;
      }
      
      .swal2-title-kitchen {
        color: hsl(var(--primary)) !important;
        font-size: 1.5rem !important;
        font-weight: 700 !important;
        margin-bottom: 0.5rem !important;
      }
      
      .swal2-html-container-kitchen {
        color: hsl(var(--foreground)) !important;
        font-size: 0.95rem !important;
        line-height: 1.6 !important;
      }
      
      .swal2-toast.swal2-popup-kitchen {
        border-left: 4px solid hsl(var(--primary)) !important;
        border-radius: 8px !important;
        min-width: 320px !important;
      }
    `
    document.head.appendChild(style)
  }
}

export default Swal

