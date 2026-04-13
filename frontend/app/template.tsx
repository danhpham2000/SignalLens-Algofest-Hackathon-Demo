"use client"

import { motion } from "framer-motion"
import { usePathname } from "next/navigation"

import { easeOutExpo } from "@/components/ui/motion"

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease: easeOutExpo }}
      className="relative"
    >
      <motion.div
        aria-hidden
        initial={{ opacity: 0.12, scaleX: 0 }}
        animate={{ opacity: 0, scaleX: 1 }}
        transition={{ duration: 0.65, ease: easeOutExpo }}
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px origin-left bg-gradient-to-r from-primary/0 via-primary/80 to-primary/0"
      />
      {children}
    </motion.div>
  )
}
