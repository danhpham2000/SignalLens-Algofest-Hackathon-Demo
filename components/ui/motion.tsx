"use client"

import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"

import { cn } from "@/lib/utils"

export const easeOutExpo = [0.22, 1, 0.36, 1] as const

type FadeInProps = HTMLMotionProps<"div"> & {
  delay?: number
  y?: number
}

export function FadeIn({
  children,
  className,
  delay = 0,
  y = 18,
  ...props
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.48, delay, ease: easeOutExpo }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

type HoverLiftProps = HTMLMotionProps<"div">

export const HoverLift = React.forwardRef<HTMLDivElement, HoverLiftProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={{ y: -4, scale: 1.01 }}
        whileTap={{ scale: 0.995 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(className)}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

HoverLift.displayName = "HoverLift"

type StaggerGroupProps = HTMLMotionProps<"div"> & {
  delayChildren?: number
  stagger?: number
}

export function StaggerGroup({
  children,
  className,
  delayChildren = 0,
  stagger = 0.08,
  ...props
}: StaggerGroupProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: {},
        show: {
          transition: {
            delayChildren,
            staggerChildren: stagger,
          },
        },
      }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

type StaggerItemProps = HTMLMotionProps<"div"> & {
  y?: number
}

export function StaggerItem({
  children,
  className,
  y = 18,
  ...props
}: StaggerItemProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y },
        show: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.42,
            ease: easeOutExpo,
          },
        },
      }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}
