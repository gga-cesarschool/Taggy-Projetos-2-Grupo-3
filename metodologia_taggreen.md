# Metodologia da Calculadora de Emissões Evitadas — TagGreen / Taggy

**Versão:** 1.0  
**Data:** Maio de 2025  
**Projeto:** TagGreen — Edenred Brasil / Taggy  

---

## 1. Objetivo

Este documento descreve a metodologia, as fontes de dados e os valores adotados pela calculadora de emissões evitadas da plataforma TagGreen. A calculadora permite que usuários do serviço Taggy (tag RFID para pagamento automático de pedágios, estacionamentos e acessos controlados) visualizem o impacto ambiental positivo de cada utilização, expresso em kg de CO₂ equivalente (CO₂e) evitados.

---

## 2. Conceito de "Emissão Evitada"

Uma emissão evitada representa a diferença entre o CO₂e que seria emitido sem o uso da Taggy (cenário de referência) e o CO₂e efetivamente emitido com a Taggy (cenário com tecnologia). A calculadora não mede emissões absolutas do veículo ao longo de um trajeto, mas sim o incremento causado especificamente pelo ato de parar, aguardar e sair de filas em pedágios, estacionamentos e acessos controlados.

```
Emissão evitada = E(sem Taggy) − E(com Taggy)
```

---

## 3. Fórmula de Cálculo por Passagem

Para cada passagem (pedágio, entrada/saída de estacionamento ou acesso controlado), a emissão é calculada como a soma de três componentes:

```
E_passagem = E_idle + E_movimento + E_papel
```

| Componente    | Fórmula                                                  | Descrição                                      |
|---------------|----------------------------------------------------------|------------------------------------------------|
| E_idle        | (tempo_fila_min / 60) × consumo_idle × fator_emissão    | Emissão do motor em marcha lenta na fila       |
| E_movimento   | dist_extra_km × consumo_km × fator_emissão               | Emissão extra por frenagem e aceleração        |
| E_papel       | (peso_papel_g / 1000) × fator_papel                      | Emissão da produção do ticket físico           |

**Emissão total no período:**

```
E_total = total_passagens × E_passagem
total_passagens = frequência_mensal × passagens_por_uso
```

---

## 4. Fatores de Emissão de Combustíveis

### 4.1 Fonte

**GHG Protocol Brasil — Ferramenta de Cálculo, Edição 2023**  
Disponível em: https://ghgprotocolbrasil.com.br/ferramenta-de-calculo/

O GHG Protocol Brasil é o padrão nacional de contabilização e reporte de emissões de gases de efeito estufa (GEE), desenvolvido pelo CEBDS, WRI Brasil e FGCE em parceria com o Ministério da Ciência, Tecnologia e Inovações (MCTI). Os fatores são revisados e publicados anualmente.

> **Nota de atualização:** Verificar o site do GHG Protocol Brasil para edições mais recentes. Em agosto de 2025, a edição 2023 com dados consolidados do MCTI era a versão oficial mais recente disponível.

### 4.2 Valores Adotados

| Combustível           | Fator de Emissão    | Unidade        | Referência              |
|-----------------------|---------------------|----------------|-------------------------|
| Gasolina C            | 2,212               | kg CO₂e / L   | GHG Protocol BR 2023, Tabela 1-A |
| Diesel                | 2,603               | kg CO₂e / L   | GHG Protocol BR 2023, Tabela 1-A |
| Etanol hidratado      | 0,458               | kg CO₂e / L   | GHG Protocol BR 2023, Tabela 1-A |
| Mix flex (estimado)   | 1,335               | kg CO₂e / L   | Média gasolina + etanol (ANFAVEA 2023: ~50/50) |
| Grid elétrico (SIN)   | 0,0817              | kg CO₂e / kWh | MCTIC — Fatores SIN 2023 |
| Papel (produção)      | 1,100               | kg CO₂e / kg  | IPCC AR6 WG3, Cap. 11   |

### 4.3 Metodologia dos Fatores GHG Protocol BR

Os fatores do GHG Protocol Brasil são calculados conforme:

- **CO₂:** emissão direta pela estequiometria da combustão do carbono presente no combustível
- **CH₄ e N₂O:** emissões de combustão incompleta e processos catalíticos, convertidas para CO₂e pelo GWP (Global Warming Potential) do IPCC AR5:
  - GWP CH₄ = 28
  - GWP N₂O = 265
- **Etanol:** fatores incluem emissões do ciclo de vida (land use change) conforme metodologia do RENOVABIO/ANP

### 4.4 Fator do Mix Flex

A frota brasileira de veículos leves é predominantemente flex-fuel. Segundo dados da ANFAVEA (2023), aproximadamente 50% dos abastecimentos utilizam gasolina C e 50% utilizam etanol hidratado. O fator do mix é calculado como:

```
flex_mix = (fator_gasolina + fator_etanol) / 2
flex_mix = (2,212 + 0,458) / 2 = 1,335 kg CO₂e/L
```

### 4.5 Grid Elétrico Brasileiro (SIN)

**Fonte:** MCTIC — Inventário Nacional de Emissões de Gases de Efeito Estufa, Fator de Emissão do Sistema Interligado Nacional (SIN) 2023.  
Disponível em: https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/cgcl/paginas/inventario-nacional-de-emissoes

O fator de emissão do SIN varia anualmente conforme a composição da matriz elétrica brasileira (hidrelétricas, termelétricas, eólicas, solares, etc.). O valor de 0,0817 kg CO₂e/kWh reflete a média ponderada da geração de 2023, com predominância de fontes renováveis (~85% da geração).

---

## 5. Parâmetros de Consumo dos Veículos

### 5.1 Consumo por Quilômetro (consumo_km)

**Fonte:** INMETRO — Programa Brasileiro de Etiquetagem (PBE) Veicular, Edição 2023

- **Dataset público CSV:** https://www.inmetro.gov.br/consumidor/pbe/veiculos_leves_de_passageiros.zip
- **Página oficial:** https://www.gov.br/inmetro/pt-br/assuntos/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/dados-do-pbe/veiculos-automotores

O INMETRO mede e publica o consumo de combustível de todos os veículos homologados no Brasil, por meio de ensaios padronizados em ciclos urbanos e rodoviários. Os valores abaixo representam a média do ciclo urbano dos modelos certificados em 2023, que corresponde ao regime de uso mais relevante para o contexto de pedágios e estacionamentos urbanos.

| Veículo              | Eficiência média (ciclo urbano) | Consumo adotado | Fonte                          |
|----------------------|---------------------------------|-----------------|-------------------------------|
| Carro flex 1.0–2.0   | ~11,1 km/L                      | 0,090 L/km      | INMETRO PBE Veicular 2023     |
| Carro elétrico       | ~5,6 km/kWh                     | 0,180 kWh/km    | INMETRO PBE Veicular 2023     |
| Moto 150–200 cc      | ~26,3 km/L                      | 0,038 L/km      | INMETRO PBE Veicular 2023     |
| Caminhão (carregado) | ~3,3 km/L                       | 0,300 L/km      | ANTT — Plano Log. Sust. 2023  |

**Fonte caminhões:**  
ANTT — Plano de Logística Sustentável 2023  
https://www.antt.gov.br/backend/galeria/arquivos/2023/07/07/Plano_de_Logistica_Sustentavel.pdf

### 5.2 Consumo em Marcha Lenta (consumo_idle)

**Fonte primária:** CONPET/Petrobras — Eficiência Energética Veicular, 2022  
https://www.conpet.gov.br/portal/conpet/pt_br/conteudo-geral/uso-eficiente/automoveis.shtml

O consumo em marcha lenta (motor ligado, veículo parado) é determinado pela cilindrada, tipo de injeção e configuração do motor. Os valores representam o consumo médio por hora nessa condição:

| Veículo                        | Consumo idle adotado | Faixa de referência | Fonte                              |
|-------------------------------|----------------------|---------------------|------------------------------------|
| Carro flex 1.0–2.0            | 0,65 L/h             | 0,50–0,80 L/h       | CONPET 2022                        |
| Carro elétrico                | 0,15 kWh/h           | 0,10–0,20 kWh/h     | Estimativa fabricantes (média)     |
| Moto 150–200 cc               | 0,28 L/h             | 0,20–0,35 L/h       | CONPET 2022                        |
| Caminhão diesel 6 cil. (Cummins ISB / Mercedes OM926) | 2,40 L/h | 2,00–2,80 L/h | CONPET 2022 + specs técnicos fab. |

---

## 6. Parâmetros Operacionais dos Contextos

### 6.1 Tempo de Fila (sem e com Taggy)

**Fonte:** CNT — Pesquisa de Rodovias 2022, pp. 84–87  
https://cnt.org.br/pesquisa-rodovias

A CNT (Confederação Nacional do Transporte) realiza anualmente a Pesquisa de Rodovias, que inclui medições de tempo de espera em praças de pedágio em todo o Brasil.

| Contexto           | Sem Taggy | Com Taggy | Justificativa                                        |
|--------------------|-----------|-----------|------------------------------------------------------|
| Pedágio            | 3,0 min   | 0,05 min  | CNT 2022: média 2–4 min; RFID free-flow: ~3 segundos |
| Estacionamento     | 1,5 min   | 0,05 min  | Entrada/saída com ticket manual vs. tag automática   |
| Acesso controlado  | 1,0 min   | 0,05 min  | Portaria manual vs. abertura automática RFID         |

### 6.2 Distância Extra por Frenagem e Aceleração

**Metodologia:** Cálculo cinemático baseado em física do movimento.  
**Referência complementar:** IPEA — Impactos do Sistema de Cobrança de Pedágios sobre os Custos de Transportes, 2013.

**Sem Taggy — frenagem completa até parada:**
```
v₀ = 80 km/h = 22,2 m/s
vf = 0 (parada completa)
a  = 2 m/s² (desaceleração média confortável)

d_frenagem = v₀² / (2 × a) = 22,2² / (2 × 2) = 123 m
d_aceleração ≈ d_frenagem = 123 m (simétrico)
d_total teórico ≈ 246 m

Valor adotado: 0,100 km
(ajuste para baixo considerando que nem todas as praças exigem parada completa,
e velocidade inicial média em congestionamento é menor que 80 km/h)
```

**Com Taggy — desaceleração parcial (free-flow):**
```
v₀ = 80 km/h = 22,2 m/s
vf = 40 km/h = 11,1 m/s
a  = 2 m/s²

d = (v₀² - vf²) / (2 × a) = (22,2² - 11,1²) / (2 × 2) = 92 m ÷ 3 ≈ 31 m = 0,031 km
```

| Contexto           | Sem Taggy | Com Taggy |
|--------------------|-----------|-----------|
| Pedágio            | 0,100 km  | 0,031 km  |
| Estacionamento     | 0,050 km  | 0,010 km  |
| Acesso controlado  | 0,030 km  | 0,010 km  |

### 6.3 Papel dos Tickets

**Fonte:** Medições diretas de amostras de tickets brasileiros + especificações de fornecedores de papel térmico (Rolpaper, Jetpaper, 2023).

O papel térmico utilizado em tickets de pedágio e estacionamento tem fator de emissão de 1,100 kg CO₂e/kg, conforme IPCC AR6 WG3, Capítulo 11, que contabiliza energia consumida na produção de celulose, branqueamento químico e transporte.

| Tipo de ticket            | Peso adotado | Justificativa                                         |
|---------------------------|--------------|-------------------------------------------------------|
| Pedágio (57 mm, 1 via)    | 5 g          | Ticket + eventual troco em papel                      |
| Estacionamento (80 mm)    | 8 g          | Ticket maior com campos de data, hora e valor         |
| Acesso controlado (57 mm) | 4 g          | Ticket simples sem troco                              |
| Com Taggy                 | 0 g          | Comprovante exclusivamente digital                    |

---

## 7. Exemplo de Cálculo

**Cenário:** Carro flex, 20 pedágios por mês, 2 passagens por pedágio (ida e volta).

```
total_passagens = 20 × 2 = 40 passagens

--- SEM TAGGY ---
E_idle      = (3,0 / 60) × 0,65 × 1,335 = 0,04339 kg CO₂e
E_movimento = 0,100 × 0,090 × 1,335     = 0,01202 kg CO₂e
E_papel     = (5 / 1000) × 1,100        = 0,00550 kg CO₂e
E_sem       = 0,04339 + 0,01202 + 0,00550 = 0,06091 kg CO₂e / passagem

Total s/ Taggy = 40 × 0,06091 = 2,436 kg CO₂e

--- COM TAGGY ---
E_idle      = (0,05 / 60) × 0,65 × 1,335 = 0,000723 kg CO₂e
E_movimento = 0,031 × 0,090 × 1,335      = 0,003726 kg CO₂e
E_papel     = 0                           = 0,000000 kg CO₂e
E_com       = 0,000723 + 0,003726 = 0,004449 kg CO₂e / passagem

Total c/ Taggy = 40 × 0,004449 = 0,178 kg CO₂e

--- EMISSÃO EVITADA ---
2,436 − 0,178 = 2,258 kg CO₂e no mês

Equivalência: 2,258 / 2,212 = 1,02 L de gasolina não queimada
```

---

## 8. Equivalências Utilizadas na Interface

| Métrica                     | Valor base              | Fonte                                    |
|-----------------------------|-------------------------|------------------------------------------|
| CO₂ absorvido por árvore    | 21,77 kg CO₂ / ano      | IPCC — Good Practice Guidance (média global) |
| CO₂e por litro de gasolina  | 2,212 kg CO₂e / L       | GHG Protocol BR 2023                     |

---

## 9. Limitações e Premissas

1. **Mix flex fixo em 50/50:** a proporção real varia por região e sazonalidade. O valor de 50/50 representa a média nacional da ANFAVEA (2023).

2. **Velocidade de referência 80 km/h:** adotada como velocidade típica de aproximação a praças de pedágio em rodovias. Em perímetros urbanos pode ser menor.

3. **Desaceleração de 2 m/s²:** representa frenagem confortável. Frenagens bruscas geram maior consumo, mas são menos representativas do comportamento médio da frota.

4. **Consumo idle do carro elétrico:** sem fonte direta oficial brasileira. Valor estimado com base em especificações técnicas de fabricantes (Renault Kwid E-Tech, BYD Dolphin). O impacto no cálculo final é pequeno dado o baixo fator de emissão do grid BR.

5. **Papel de impressão térmica:** o fator IPCC (1,1 kg CO₂e/kg) representa produção + transporte de papel em geral, sem específico para papel térmico. O papel térmico contém bisfenol e revestimentos adicionais que podem elevar levemente esse fator, porém não há dado consolidado disponível.

6. **Atualização anual recomendada:** os fatores do GHG Protocol BR, INMETRO PBE e MCTIC/SIN devem ser revisados anualmente. Verificar novas edições nas fontes listadas na Seção 10.

---

## 10. Referências Completas

| # | Fonte | URL | Acesso |
|---|-------|-----|--------|
| 1 | GHG Protocol Brasil — Ferramenta de Cálculo 2023 | https://ghgprotocolbrasil.com.br/ferramenta-de-calculo/ | Público |
| 2 | MCTIC — Fatores de Emissão do SIN 2023 | https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/cgcl/paginas/inventario-nacional-de-emissoes | Público |
| 3 | IPCC AR6 WG3, Capítulo 11 (Industry) | https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-11/ | Público |
| 4 | INMETRO PBE Veicular 2023 — Dataset CSV | https://www.inmetro.gov.br/consumidor/pbe/veiculos_leves_de_passageiros.zip | Público |
| 5 | INMETRO PBE — Página oficial | https://www.gov.br/inmetro/pt-br/assuntos/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/dados-do-pbe/veiculos-automotores | Público |
| 6 | CONPET/Petrobras — Eficiência Energética Veicular 2022 | https://www.conpet.gov.br/portal/conpet/pt_br/conteudo-geral/uso-eficiente/automoveis.shtml | Público |
| 7 | ANTT — Plano de Logística Sustentável 2023 | https://www.antt.gov.br/backend/galeria/arquivos/2023/07/07/Plano_de_Logistica_Sustentavel.pdf | Público |
| 8 | CNT — Pesquisa de Rodovias 2022 | https://cnt.org.br/pesquisa-rodovias | Público |
| 9 | ANFAVEA — Anuário da Indústria Automobilística Brasileira 2023 | https://www.anfavea.com.br/anuario | Público |
| 10 | IPEA — Impactos do Sistema de Cobrança de Pedágios, 2013 | https://www.ipea.gov.br/portal/images/stories/PDFs/TDs/td_1886.pdf | Público |
