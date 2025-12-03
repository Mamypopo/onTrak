import Swal from 'sweetalert2'

export const showToast = {
  success: (title: string, text?: string) => {
    Swal.fire({
      icon: 'success',
      title,
      text,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
  },
  error: (title: string, text?: string) => {
    Swal.fire({
      icon: 'error',
      title,
      text,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
  },
  warning: (title: string, text?: string) => {
    Swal.fire({
      icon: 'warning',
      title,
      text,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
  },
  info: (title: string, text?: string) => {
    Swal.fire({
      icon: 'info',
      title,
      text,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
  },
}

