"use client"

import { useEffect } from "react"

/**
 * Lightweight Web Vitals reporter.
 * Reports CLS, FID, LCP, FCP, TTFB to console and optional endpoint.
 * No external dependencies.
 */

interface WebVitalMetric {
  name: "CLS" | "FID" | "LCP" | "FCP" | "TTFB"
  value: number
  rating: "good" | "needs-improvement" | "poor"
  delta: number
  id: string
}

const thresholds = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  LCP: { good: 2500, poor: 4000 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
}

function getRating(name: WebVitalMetric["name"], value: number): WebVitalMetric["rating"] {
  const t = thresholds[name]
  if (value <= t.good) return "good"
  if (value >= t.poor) return "poor"
  return "needs-improvement"
}

function sendToAnalytics(metric: WebVitalMetric) {
  // Send to console in development
  const isDev = import.meta.env?.DEV === true
  if (isDev) {
    console.log(`[WebVitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`, metric)
  }

  // Send to custom endpoint if configured
  const endpoint = (window as any).__WEB_VITALS_ENDPOINT__
  if (endpoint) {
    const body = JSON.stringify({
      ...metric,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
    })
    navigator.sendBeacon(endpoint, body)
  }
}

export function WebVitals() {
  useEffect(() => {
    if (typeof window === "undefined") return

    // CLS - Cumulative Layout Shift
    let clsValue = 0
    let clsEntries: PerformanceEntry[] = []
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value
          clsEntries.push(entry)
          sendToAnalytics({
            name: "CLS",
            value: clsValue,
            rating: getRating("CLS", clsValue),
            delta: (entry as any).value,
            id: entry.name,
          })
        }
      }
    })
    clsObserver.observe({ type: "layout-shift", buffered: true })

    // FID - First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming
        const delay = fidEntry.processingStart - fidEntry.startTime
        sendToAnalytics({
          name: "FID",
          value: delay,
          rating: getRating("FID", delay),
          delta: delay,
          id: entry.name,
        })
      }
    })
    fidObserver.observe({ type: "first-input", buffered: true })

    // LCP - Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      sendToAnalytics({
        name: "LCP",
        value: lastEntry.startTime,
        rating: getRating("LCP", lastEntry.startTime),
        delta: lastEntry.startTime,
        id: lastEntry.name,
      })
    })
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true })

    // FCP - First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          sendToAnalytics({
            name: "FCP",
            value: entry.startTime,
            rating: getRating("FCP", entry.startTime),
            delta: entry.startTime,
            id: entry.name,
          })
        }
      }
    })
    fcpObserver.observe({ type: "paint", buffered: true })

    // TTFB - Time to First Byte (from navigation timing)
    const navObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const navEntry = entry as PerformanceNavigationTiming
        const ttfb = navEntry.responseStart - navEntry.requestStart
        sendToAnalytics({
          name: "TTFB",
          value: ttfb,
          rating: getRating("TTFB", ttfb),
          delta: ttfb,
          id: entry.name,
        })
      }
    })
    navObserver.observe({ type: "navigation", buffered: true })

    // Cleanup
    return () => {
      clsObserver.disconnect()
      fidObserver.disconnect()
      lcpObserver.disconnect()
      fcpObserver.disconnect()
      navObserver.disconnect()
    }
  }, [])

  return null
}

// Initialize error reporter global
if (typeof window !== "undefined") {
  ;(window as any).__ERROR_REPORTER__ = (error: Error, errorInfo?: React.ErrorInfo) => {
    const endpoint = (window as any).__ERROR_REPORTER_ENDPOINT__
    if (endpoint) {
      navigator.sendBeacon(endpoint, JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      }))
    }
  }

  ;(window as any).__WEB_VITALS_ENDPOINT__ = (window as any).__WEB_VITALS_ENDPOINT__ || ""
  ;(window as any).__ERROR_REPORTER_ENDPOINT__ = (window as any).__ERROR_REPORTER_ENDPOINT__ || ""
}

export function initWebVitals(endpoint?: string) {
  if (typeof window !== "undefined" && endpoint) {
    ;(window as any).__WEB_VITALS_ENDPOINT__ = endpoint
  }
}

export function initErrorReporter(endpoint?: string) {
  if (typeof window !== "undefined" && endpoint) {
    ;(window as any).__ERROR_REPORTER_ENDPOINT__ = endpoint
  }
}