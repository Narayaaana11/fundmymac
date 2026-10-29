/**
 * =========================================================================
 * Sponsorship Enquiry & Waitlist API Service
 * =========================================================================
 * 
 * Securely submits waitlist expressions of interest to the Supabase
 * sponsorship_enquiries table under Row-Level Security.
 */

import { supabase, isSupabaseConfigured } from './supabase';

export interface SponsorshipEnquiryPayload {
  name: string;
  email: string;
  preferredSpotId?: number | null;
  tierId?: string | null;
  websiteUrl?: string | null;
  message?: string | null;
}

export interface EnquirySubmissionResult {
  success: boolean;
  message?: string;
  error?: string;
}

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export async function submitSponsorshipEnquiry(
  payload: SponsorshipEnquiryPayload
): Promise<EnquirySubmissionResult> {
  const trimmedName = (payload.name || '').trim();
  const trimmedEmail = (payload.email || '').trim().toLowerCase();
  const trimmedUrl = (payload.websiteUrl || '').trim();
  const trimmedMsg = (payload.message || '').trim();

  // 1. Client-Side Validation
  if (!trimmedName || trimmedName.length < 1) {
    return { success: false, error: 'Please enter your name or company name.' };
  }
  if (trimmedName.length > 120) {
    return { success: false, error: 'Name must not exceed 120 characters.' };
  }

  if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (trimmedEmail.length > 255) {
    return { success: false, error: 'Email address must not exceed 255 characters.' };
  }

  if (trimmedUrl && trimmedUrl.length > 300) {
    return { success: false, error: 'Website URL must not exceed 300 characters.' };
  }

  if (trimmedMsg && trimmedMsg.length > 2000) {
    return { success: false, error: 'Message must not exceed 2,000 characters.' };
  }

  // 2. Insert to Supabase (Protected by RLS with zero anon SELECT)
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('sponsorship_enquiries').insert([
        {
          name: trimmedName,
          email: trimmedEmail,
          preferred_spot_id: payload.preferredSpotId || null,
          tier_id: payload.tierId || null,
          website_url: trimmedUrl || null,
          message: trimmedMsg || null
        }
      ]);

      if (error) {
        // Guard against duplicate or database policy errors without exposing SQL internals
        return {
          success: false,
          error: 'We were unable to record your enquiry at this moment. Please try again shortly.'
        };
      }

      return {
        success: true,
        message: "You're on the waitlist! We'll reach out as soon as sponsorships officially open."
      };
    } catch {
      return {
        success: false,
        error: 'Network connectivity issue. Please check your connection and try again.'
      };
    }
  }

  // Fallback for offline / unconfigured local dev environment
  try {
    const queue = JSON.parse(localStorage.getItem('fmm_pending_enquiries') || '[]');
    queue.push({
      ...payload,
      submittedAt: new Date().toISOString()
    });
    localStorage.setItem('fmm_pending_enquiries', JSON.stringify(queue));
  } catch {
    // Ignore localStorage write failures
  }

  return {
    success: true,
    message: "You're on the waitlist! (Local preview mode recorded)."
  };
}
