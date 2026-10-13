export interface Message {
  id: string; conversation_id: string; sender_id: string; message_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'voice'; text_content: string | null;
  media_path: string | null; media_name: string | null; media_size: number | null; media_mime_type: string | null; thumbnail_path: string | null;
  reply_to_message_id: string | null; created_at: string; updated_at: string; delivered_at: string | null; read_at: string | null; edited_at: string | null; deleted_for_everyone_at: string | null;
  local_state?: 'sending' | 'failed';
}
export interface Preferences { read_receipts: boolean; last_seen: boolean; notifications: boolean; notification_preview: boolean }
export interface Reaction { message_id: string; user_id: string; reaction: string }
export interface Note { id: string; title: string; content: string; created_by: string; updated_by: string; updated_at: string }
export interface CallRecord { id: string; conversation_id: string; caller_id: string; receiver_id: string; call_type: 'voice' | 'video'; status: string; started_at: string; answered_at: string | null; ended_at: string | null; duration_seconds: number | null }
