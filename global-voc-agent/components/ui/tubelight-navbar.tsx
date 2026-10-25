"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface NavItem {
  name: string
  url: string
  icon: LucideIcon
}

export interface NavBarProps {
  items: NavItem[]
  className?: string
  activeTab?: string
  onTabChange?: (name: string) => void
}

export function NavBar({ items, className, activeTab: propActiveTab, onTabChange }: NavBarProps) {
  const [activeTab, setActiveTab] = useState(propActiveTab || items[0].name)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (propActiveTab) {
      setActiveTab(propActiveTab)
    }
  }, [propActiveTab])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleSelect = (name: string) => {
    setActiveTab(name)
    if (onTabChange) onTabChange(name)
  }

  return (
    <div
      className={cn(
        "relative z-40 flex items-center justify-center",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 bg-background/70 border border-border/80 backdrop-blur-xl py-1.5 px-2 rounded-full shadow-lg">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.name

          return (
            <Link
              key={item.name}
              href={item.url}
              onClick={(e) => {
                e.preventDefault()
                handleSelect(item.name)
              }}
              className={cn(
                "relative cursor-pointer text-sm font-semibold px-5 py-2 rounded-full transition-colors flex items-center gap-2",
                "text-muted-foreground hover:text-foreground",
                isActive && "bg-muted/60 text-primary font-bold",
              )}
            >
              <Icon size={16} strokeWidth={2.3} className="shrink-0" />
              <span>{item.name}</span>
              {isActive && (
                <motion.div
                  layoutId="tubelight-lamp"
                  className="absolute inset-0 w-full bg-primary/5 rounded-full -z-10"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 320,
                    damping: 32,
                  }}
                >
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full shadow-[0_0_12px_rgba(171,23,54,0.8)]">
                    <div className="absolute w-12 h-6 bg-primary/25 rounded-full blur-md -top-2 -left-2" />
                    <div className="absolute w-8 h-4 bg-primary/30 rounded-full blur-sm -top-1" />
                    <div className="absolute w-4 h-3 bg-primary/40 rounded-full blur-[2px] top-0 left-2" />
                  </div>
                </motion.div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
