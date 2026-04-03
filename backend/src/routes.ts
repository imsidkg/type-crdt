import { Router } from 'express'
import { handleAIStream, type AIRequest } from './ai.js'
import { compactDocument, getDocumentHistory } from './persistence.js'

const router = Router()

router.post('/ai/stream', async (req, res) => {
  const aiRequest: AIRequest = req.body
  if (!aiRequest.action || !aiRequest.text) {
    return res.status(400).json({ error: 'action and text are required' })
  }
  await handleAIStream(aiRequest, res)
})

router.post('/ai/complete', async (req, res) => {
  try {
    const { handleAICompletion } = await import('./ai.js')
    const aiRequest: AIRequest = req.body
    if (!aiRequest.action || !aiRequest.text) {
      return res.status(400).json({ error: 'action and text are required' })
    }
    const result = await handleAICompletion(aiRequest)
    res.json({ result })
  } catch (error) {
    res.status(500).json({ error: 'AI request failed' })
  }
})

router.post('/documents/:name/compact', async (req, res) => {
  try {
    await compactDocument(req.params.name)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Compaction failed' })
  }
})

router.get('/documents/:name/history', async (req, res) => {
  try {
    const history = await getDocumentHistory(req.params.name)
    res.json(history)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default router
