const request = require('supertest');
const app = require('../src/server'); // Importa o servidor diretamente

describe('Testes da API de Agregação de Dados', () => {
  
  // Teste 1: Validando o Health Check
  it('Deve retornar status 200 e a mensagem de healthy no Health Check', async () => {
    const response = await request(app).get('/api/v1/health');
    
    expect(response.statusCode).toEqual(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body).toHaveProperty('timestamp');
  });

  // Teste 2: Validando o Erro 400 no endpoint de Cidades
  it('Deve retornar erro 400 ao enviar uma sigla de UF inválida', async () => {
    // Enviamos "CEARA" ao invés de apenas "CE"
    const response = await request(app).get('/api/v1/cidades/CEARA');
    
    expect(response.statusCode).toEqual(400);
    expect(response.body.erro).toBe(true);
    expect(response.body.codigo).toBe('SIGLA_UF_INVALIDA');
  });

});