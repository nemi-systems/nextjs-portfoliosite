import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb'
import type { ActiveBoardRecord, BoardMode, BoardRecord } from './types'
import { activeBoardSk } from './validation'

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: {
    removeUndefinedValues: true,
  },
})

export function boardPk(boardId: string) {
  return `BOARD#${boardId}`
}

export async function getActiveBoardRecord(tableName: string, mode: BoardMode = 'english') {
  const response = await documentClient.send(new GetCommand({
    TableName: tableName,
    Key: { pk: 'ACTIVE', sk: activeBoardSk(mode) },
  }))

  const active = response.Item as ActiveBoardRecord | undefined
  if (active || mode !== 'english') {
    return active
  }

  const legacyResponse = await documentClient.send(new GetCommand({
    TableName: tableName,
    Key: { pk: 'ACTIVE', sk: 'BOARD' },
  }))

  return legacyResponse.Item as ActiveBoardRecord | undefined
}

export async function getBoardRecord(tableName: string, boardId: string) {
  const response = await documentClient.send(new GetCommand({
    TableName: tableName,
    Key: { pk: boardPk(boardId), sk: 'META' },
  }))

  return response.Item as BoardRecord | undefined
}

export async function getActiveBoard(tableName: string, mode: BoardMode = 'english') {
  const active = await getActiveBoardRecord(tableName, mode)
  if (!active) {
    return undefined
  }
  return getBoardRecord(tableName, active.boardId)
}

export async function writeActiveBoard(tableName: string, board: BoardRecord, updatedAt: string) {
  const active: ActiveBoardRecord = {
    pk: 'ACTIVE',
    sk: activeBoardSk(board.mode),
    boardId: board.boardId,
    updatedAt,
  }

  await documentClient.send(new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: tableName,
          Item: board,
          ConditionExpression: 'attribute_not_exists(pk)',
        },
      },
      {
        Put: {
          TableName: tableName,
          Item: active,
        },
      },
    ],
  }))
}
