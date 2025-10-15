// Utility to suppress specific React warnings from third-party libraries
export const suppressBlockscoutWarnings = () => {
  const originalError = console.error
  const originalWarn = console.warn

  console.error = (...args: any[]) => {
    const message = args[0]
    
    // Suppress the specific Blockscout SDK warning about boolean 'show' attribute
    if (typeof message === 'string' && 
        message.includes('Received `false` for a non-boolean attribute `show`') &&
        message.includes('@blockscout_app-sdk')) {
      return // Suppress this specific warning
    }
    
    // Allow all other errors to pass through
    originalError.apply(console, args)
  }

  console.warn = (...args: any[]) => {
    const message = args[0]
    
    // Suppress the specific Blockscout SDK warning about boolean 'show' attribute
    if (typeof message === 'string' && 
        message.includes('Received `false` for a non-boolean attribute `show`') &&
        message.includes('@blockscout_app-sdk')) {
      return // Suppress this specific warning
    }
    
    // Allow all other warnings to pass through
    originalWarn.apply(console, args)
  }

  // Return cleanup function
  return () => {
    console.error = originalError
    console.warn = originalWarn
  }
}
