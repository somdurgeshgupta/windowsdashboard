export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  type: 'TEXT' | 'FILE';
  text?: string;
  fileUrl?: string;
  createdAt: string;
}
