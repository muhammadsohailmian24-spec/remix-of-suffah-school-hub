import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const WARNING_BEFORE_TIMEOUT = 2 * 60 * 1000; // 2 minutes warning

interface UseSessionTimeoutOptions {
  enabled?: boolean;
  timeoutMs?: number;
  warningMs?: number;
  onWarning?: () => void;
}

export const useSessionTimeout = (options: UseSessionTimeoutOptions = {}) => {
  const {
    enabled = true,
    timeoutMs = INACTIVITY_TIMEOUT,
    warningMs = WARNING_BEFORE_TIMEOUT,
    onWarning,
  } = options;

  const navigate = useNavigate();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const hasWarnedRef = useRef(false);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      toast({
        title: "Session expired",
        description: "You have been logged out due to inactivity.",
        variant: "destructive",
      });
      navigate("/auth?logout=true", { replace: true });
    } catch (error) {
      console.error("Session timeout logout error:", error);
      navigate("/auth?logout=true", { replace: true });
    }
  }, [navigate, toast]);

  const showWarning = useCallback(() => {
    if (!hasWarnedRef.current) {
      hasWarnedRef.current = true;
      toast({
        title: "Session expiring soon",
        description: "You will be logged out in 2 minutes due to inactivity. Move your mouse or press a key to stay logged in.",
        duration: 10000,
      });
      onWarning?.();
    }
  }, [toast, onWarning]);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    
    // Reset warning flag
    hasWarnedRef.current = false;

    // Set warning timer
    warningRef.current = setTimeout(() => {
      showWarning();
    }, timeoutMs - warningMs);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, timeoutMs);
  }, [enabled, timeoutMs, warningMs, handleLogout, showWarning]);

  useEffect(() => {
    if (!enabled) return;

    // Events that indicate user activity
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    // Throttle reset to avoid too many timer resets
    let lastReset = Date.now();
    const throttledReset = () => {
      const now = Date.now();
      if (now - lastReset > 1000) { // Only reset if more than 1 second since last reset
        lastReset = now;
        resetTimer();
      }
    };

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, throttledReset, { passive: true });
    });

    // Initial timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, throttledReset);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [enabled, resetTimer]);

  return { resetTimer };
};
