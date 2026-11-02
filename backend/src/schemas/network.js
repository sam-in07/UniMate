import { z } from 'zod';

export const listingCreateSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(150),
  author: z.string().min(2, 'Author name is required').max(120),
  edition: z.string().max(50).optional().default(''),
  isbn: z.string().max(30).optional().default(''),
  tags: z.array(z.string()).max(10).default([]),
  condition: z.enum(['new', 'like_new', 'good', 'fair']).default('good'),
  price: z.number().min(0, 'Price must be 0 or higher').max(100000),
  currency: z.string().default('BDT'),
  university: z.string().max(150).optional().default(''),
  city: z.string().max(100).optional().default(''),
  description: z.string().min(5, 'Description must be at least 5 characters').max(2000),
  photos: z.array(z.string().max(800000)).max(3).default([]), // up to 3 photos
  status: z.enum(['active', 'sold', 'hidden']).default('active')
});

export const listingUpdateSchema = listingCreateSchema.partial();

export const listingAiAssistSchema = z.object({
  query: z.string().min(2).max(200).optional(),
  title: z.string().min(2).max(200).optional(),
  isbn: z.string().max(50).optional(),
  coverPhoto: z.string().max(1500000).optional()
}).refine(data => data.query || data.title || data.isbn || data.coverPhoto, {
  message: 'Please provide at least a query, title, ISBN, or photo'
});

export const semanticSearchSchema = z.object({
  query: z.string().min(2, 'Search query must be at least 2 characters').max(300)
});

export const connectionRequestSchema = z.object({
  toUid: z.string().min(1, 'Target user ID is required'),
  message: z.string().max(500).optional().default('')
});

export const connectionStatusSchema = z.object({
  status: z.enum(['accepted', 'declined'])
});

export const chatMessageSchema = z.object({
  text: z.string().min(1, 'Message cannot be empty').max(2000)
});

export const reportSchema = z.object({
  targetType: z.enum(['listing', 'profile', 'message', 'pastQuestion']),
  targetId: z.string().min(1),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500)
});

export const blockSchema = z.object({
  blockedUid: z.string().min(1)
});

