import { FastifySchema } from 'fastify';

/**
 * Validation schemas for API endpoints
 */

export const sendTipSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['senderId', 'recipientId', 'amount', 'message'],
    properties: {
      senderId: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: '^[a-zA-Z0-9_-]+$'
      },
      recipientId: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: '^[a-zA-Z0-9_-]+$'
      },
      amount: {
        oneOf: [
          { type: 'string', pattern: '^[0-9]+(\\.[0-9]+)?$' },
          { type: 'number', minimum: 0.000001 }
        ]
      },
      message: {
        type: 'string',
        minLength: 1,
        maxLength: 1000
      },
      metadata: {
        type: 'object',
        additionalProperties: true
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        ipfsCid: { type: 'string' },
        status: { type: 'string' },
        error: { type: 'string' }
      }
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        details: { type: 'object' }
      }
    }
  }
};

export const leaderboardSchema: FastifySchema = {
  params: {
    type: 'object',
    properties: {
      period: {
        type: 'string',
        enum: ['all', 'weekly', 'monthly']
      }
    }
  },
  querystring: {
    type: 'object',
    properties: {
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 1000,
        default: 100
      }
    }
  }
};

export const userStatsSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: {
        type: 'string',
        minLength: 1,
        maxLength: 100
      }
    }
  }
};

