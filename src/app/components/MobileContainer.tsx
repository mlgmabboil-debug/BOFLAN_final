'use client'

import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'

interface MobileContainerProps {
  children: React.ReactNode
  className?: string
}

export function MobileContainer({ children, className = '' }: MobileContainerProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [screenWidth, setScreenWidth] = useState(0)
  const location = useLocation()

  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth
      setScreenWidth(width)
      setIsMobile(width < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Scroll to top on route change on mobile
    if (isMobile) {
      window.scrollTo(0, 0)
    }
  }, [location.pathname, isMobile])

  return (
    <div 
      className={`mobile-container ${isMobile ? 'mobile' : 'desktop'} ${className}`}
      style={{
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        minHeight: '100vh'
      }}
    >
      {/* Mobile Viewport Meta */}
      {isMobile && (
        <style>{`
          @viewport {
            width: device-width;
            initial-scale: 1.0;
            maximum-scale: 1.0;
            user-scalable: no;
          }
        `}</style>
      )}

      {/* Safe Area Padding */}
      <div className="safe-area-inset-top" />
      
      {/* Main Content */}
      <div className="mobile-content">
        {children}
      </div>
      
      {/* Safe Area Bottom Padding */}
      <div className="safe-area-inset-bottom" />
      
      {/* Mobile Styles */}
      <style>{`
        .mobile-container {
          position: relative;
          overflow-x: hidden;
        }
        
        .mobile {
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
        
        .mobile-content {
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }
        
        /* Prevent horizontal scroll */
        * {
          box-sizing: border-box;
        }
        
        /* Touch-friendly interactions */
        .mobile button,
        .mobile a,
        .mobile input,
        .mobile select,
        .mobile textarea {
          min-height: 44px;
          min-width: 44px;
        }
        
        /* Mobile text adjustments */
        .mobile {
          font-size: 16px; /* Prevent zoom on iOS */
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        
        /* Mobile scrolling */
        .mobile {
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }
        
        /* Mobile focus styles */
        .mobile *:focus {
          outline: 2px solid #00D084;
          outline-offset: 2px;
        }
        
        /* Mobile selection */
        .mobile ::selection {
          background: #00D084;
          color: white;
        }
        
        /* Mobile tap highlight */
        .mobile * {
          -webkit-tap-highlight-color: transparent;
        }
        
        /* Mobile viewport height fix */
        .mobile {
          height: 100vh;
          height: -webkit-fill-available;
        }
        
        /* Mobile safe areas */
        @supports (padding: max(0px)) {
          .safe-area-inset-top {
            padding-top: max(0px, env(safe-area-inset-top));
          }
          
          .safe-area-inset-bottom {
            padding-bottom: max(0px, env(safe-area-inset-bottom));
          }
        }
      `}</style>
    </div>
  )
}
