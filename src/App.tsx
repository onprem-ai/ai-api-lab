import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Text } from './pages/Text'
import { LlmOcr } from './pages/LlmOcr'
import { PaddleOcr } from './pages/PaddleOcr'
import { Asr } from './pages/Asr'
import { LlmApi } from './pages/LlmApi'
import { ApiStandards } from './pages/ApiStandards'
import { Layout } from './components/Layout'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/llm" replace />} />
          <Route path="/llm" element={<Text />} />
          <Route path="/llm-vl" element={<LlmOcr />} />
          <Route path="/paddle-ocr" element={<PaddleOcr />} />
          <Route path="/asr" element={<Asr />} />
          <Route path="/llm-api" element={<LlmApi />} />
          <Route path="/api-standards" element={<ApiStandards />} />
          <Route path="/api-standards/:handlerType" element={<ApiStandards />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
