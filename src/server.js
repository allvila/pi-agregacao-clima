const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Middlewares padrão
app.use(express.json());
app.use(cors());

// ==========================================
// Endpoint 3: Health Check
// ==========================================
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: "healthy",
    versao: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// Endpoint 2: Listagem de Cidades por Estado
// ==========================================
app.get('/api/v1/cidades/:sigla_uf', async (req, res) => {
  try {
    const sigla_uf = req.params.sigla_uf.toUpperCase();
    const limite = parseInt(req.query.limite) || 10;

    // Validação de erro 400
    if (sigla_uf.length !== 2 || !/^[A-Z]{2}$/.test(sigla_uf)) {
      return res.status(400).json({
        erro: true,
        codigo: "SIGLA_UF_INVALIDA",
        mensagem: "A sigla do estado deve conter exatamente 2 letras",
        sigla_uf_informada: req.params.sigla_uf
      });
    }

    const response = await axios.get(`https://brasilapi.com.br/api/ibge/municipios/v1/${sigla_uf}`);

    const cidades = response.data
      .slice(0, limite)
      .map(cidade => ({ nome: cidade.nome }));

    return res.status(200).json({
      uf: sigla_uf,
      quantidade_retornada: cidades.length,
      cidades: cidades,
      consultado_em: new Date().toISOString()
    });

  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({
        erro: true,
        codigo: "UF_NAO_ENCONTRADA",
        mensagem: "Estado com a sigla informada não foi encontrado",
        sigla_uf_informada: req.params.sigla_uf
      });
    }

    return res.status(503).json({
      erro: true,
      codigo: "SERVICO_EXTERNO_INDISPONIVEL",
      mensagem: "Não foi possível obter dados do serviço externo. Tente novamente em alguns instantes",
      servico: "IBGE/BrasilAPI"
    });
  }
});

// ==========================================
// Endpoint 1: Informações da Cidade com Clima
// ==========================================
app.get('/api/v1/clima/:nome_cidade', async (req, res) => {
  try {
    const nomeCidade = req.params.nome_cidade;

    // Validação de erro 400
    if (nomeCidade.length < 2) {
      return res.status(400).json({
        erro: true,
        codigo: "NOME_INVALIDO",
        mensagem: "O nome da cidade deve conter pelo menos 2 caracteres",
        nome_informado: nomeCidade
      });
    }

    // 1ª Chamada: API de Geocoding do Open-Meteo para pegar Lat/Lng
    const geoResponse = await axios.get(`https://geocoding-api.open-meteo.com/v1/search`, {
      params: { 
        name: nomeCidade, 
        count: 1, 
        language: 'pt',
        format: 'json'
      }
    });

    if (!geoResponse.data.results || geoResponse.data.results.length === 0) {
      return res.status(404).json({
        erro: true,
        codigo: "CIDADE_NAO_ENCONTRADA",
        mensagem: "Nenhuma cidade encontrada com o nome informado",
        nome_informado: nomeCidade
      });
    }

    const { latitude, longitude, name: nomeFormatado, admin1: estado } = geoResponse.data.results[0];

    // 2ª Chamada: API de Forecast do Open-Meteo usando as coordenadas
    const climaResponse = await axios.get(`https://api.open-meteo.com/v1/forecast`, {
      params: {
        latitude: latitude,
        longitude: longitude,
        daily: 'temperature_2m_max,temperature_2m_min',
        timezone: 'America/Sao_Paulo',
        forecast_days: 1
      }
    });

    const previsaoDiaria = climaResponse.data.daily;

    // Resposta formatada conforme exigência do projeto
    return res.status(200).json({
      nome: nomeFormatado,
      estado: estado || "Não informado",
      clima: {
        temperatura_min: previsaoDiaria.temperature_2m_min[0],
        temperatura_max: previsaoDiaria.temperature_2m_max[0],
        condicao: "Dados processados via Open-Meteo",
        unidades: {
          temperatura: "°C"
        }
      },
      consultado_em: new Date().toISOString()
    });

  } catch (error) {
    return res.status(503).json({
      erro: true,
      codigo: "SERVICO_EXTERNO_INDISPONIVEL",
      mensagem: "Não foi possível obter dados do serviço externo. Tente novamente em alguns instantes",
      servico: "Open-Meteo"
    });
  }
});

// ==========================================
// Iniciando o Servidor
// ==========================================
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando com sucesso na porta ${PORT}`);
  console.log(`- Health Check: http://localhost:${PORT}/api/v1/health`);
  console.log(`- Cidades por UF: http://localhost:${PORT}/api/v1/cidades/CE`);
  console.log(`- Clima: http://localhost:${PORT}/api/v1/clima/Fortaleza`);
});
module.exports = app;