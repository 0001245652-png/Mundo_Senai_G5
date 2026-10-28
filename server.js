const { TuyaContext } = require('@tuya/tuya-connector-nodejs')
const express = require('express')
const cors = require('cors')

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())

// Configuração do cliente Tuya (Verifique se estas chaves pertencem ao projeto "Mundo Senai")
const tuya = new TuyaContext({
  baseUrl: 'https://openapi.tuyaus.com', // Western America Data Center
  accessKey: 'au8d7mryexwnercku4ne',
  secretKey: 'eb162f12728246808701fa6e07218b19',
})

const deviceId = 'ebf14bb38458259498wv0v'
const SWITCH_CODE = 'switch_1'

// 1. Rota GET: Consulta o status da lâmpada
app.get('/api/lampada', async (req, res) => {
  try {
    const deviceInfo = await tuya.request({
      path: `/v1.0/devices/${deviceId}`,
      method: 'GET',
    })

    console.log('[TUYA GET RESPOSTA]:', JSON.stringify(deviceInfo, null, 2))
    
    if (!deviceInfo.success) { //tratamento de erro
      return res.status(400).json({
        erro: 'Tuya recusou a consulta',
        codigoTuya: deviceInfo.code,
        mensagemTuya: deviceInfo.msg,
      })
    }

    const statusList = deviceInfo.result?.status || []
    const switchStatus = statusList.find(s => s.code === SWITCH_CODE)
    const acesa = switchStatus ? Boolean(switchStatus.value) : false

    res.json({ acesa, detalhes: deviceInfo })
  } catch (error) {
    console.error('Erro na requisição GET:', error)
    res.status(500).json({ erro: 'Falha no servidor local', detalhe: error.message })
  }
})

// 2. Rota POST: Envia o comando de LIGAR/DESLIGAR
app.post('/api/lampada', async (req, res) => {
  const { acesa } = req.body

  if (typeof acesa !== 'boolean') {
    return res.status(400).json({ erro: 'O campo "acesa" deve ser um booleano (true ou false).' })
  }

  try {
    console.log(`\n--- Enviando comando para a Tuya: [${SWITCH_CODE} = ${acesa}] ---`)

    const commandResponse = await tuya.request({
      path: `/v1.0/devices/${deviceId}/commands`,
      method: 'POST',
      body: {
        commands: [
          {
            code: SWITCH_CODE,
            value: acesa,
          },
        ],
      },
    })

    console.log('[TUYA POST RESPOSTA BRUTA]:', JSON.stringify(commandResponse, null, 2))

    // Se a Tuya retornar success: false
    if (!commandResponse || commandResponse.success === false) { //tratamento de erro
      console.error(`❌ FALHA TUYA! Código: ${commandResponse?.code} | Mensagem: ${commandResponse?.msg}`)
      return res.status(400).json({
        erro: 'A Tuya recusou o comando.',
        codigoErro: commandResponse?.code,
        mensagemTuya: commandResponse?.msg,
      })
    }

    console.log(`✅ SUCESSO! A lâmpada respondeu: ${acesa ? 'LIGADA' : 'DESLIGADA'}`)
    res.json({ mensagem: 'Comando executado!', resposta: commandResponse })
  } catch (error) {
    console.error('Erro grave na requisição POST:', error)
    res.status(500).json({ erro: 'Erro no servidor backend', detalhe: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`)
})