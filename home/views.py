from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_GET

# ---------------------------------------------------------------------------
# Página principal
# ---------------------------------------------------------------------------

def home(request):
    return render(request, 'home.html')


# ---------------------------------------------------------------------------
# Página Empresas — Painel ESG Corporativo
# ---------------------------------------------------------------------------

def empresas_relatorios(request):
    return render(request, 'empresas_relatorios.html')


# ===========================================================================
# FATORES DE EMISSÃO DE COMBUSTÍVEIS
# ===========================================================================
#
# Fonte: GHG Protocol Brasil — Ferramenta de Cálculo, Edição 2023
#        https://ghgprotocolbrasil.com.br/ferramenta-de-calculo/
#
# Nota: verificar anualmente se há edição mais recente disponível no site
#       do GHG Protocol Brasil. Em agosto de 2025, a edição 2023 era a
#       mais recente com dados consolidados do MCTIC/MCTI.
#
# Metodologia: os fatores expressam kg de CO2 equivalente (CO2e) por litro
# de combustível consumido, considerando o Poder de Aquecimento Global (GWP)
# do CO2, CH4 e N2O conforme IPCC AR5 (base GHG Protocol BR).
#
# Fator flex_mix: média simples gasolina/etanol, representando o
# comportamento médio da frota flex brasileira (estimativa ANFAVEA 2023:
# ~50% dos abastecimentos em gasolina C, ~50% em etanol hidratado).
# ===========================================================================

FATORES_EMISSAO = {
    'gasolina': 2.212,   # kg CO2e / litro — GHG Protocol BR 2023, Tabela 1-A
    'diesel':   2.603,   # kg CO2e / litro — GHG Protocol BR 2023, Tabela 1-A
    'etanol':   0.458,   # kg CO2e / litro — GHG Protocol BR 2023, Tabela 1-A (etanol hidratado)
    'flex_mix': 1.335,   # kg CO2e / litro — média ponderada: (2.212 + 0.458) / 2
    'grid_br':  0.0817,  # kg CO2e / kWh   — MCTIC, Fatores de Emissão do SIN 2023
                         #                    https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/
                         #                    cgcl/paginas/inventario-nacional-de-emissoes
    'papel':    1.100,   # kg CO2e / kg    — IPCC AR6 WG3, Ch. 11 (produção + transporte)
}


# ===========================================================================
# PARÂMETROS DE CONSUMO DOS VEÍCULOS
# ===========================================================================
#
# consumo_km   → litros (ou kWh) por quilômetro em velocidade normal
# consumo_idle → litros (ou kWh) por hora em marcha lenta (idle)
#
# --- Carros leves a combustão (flex) ---
# Fonte: INMETRO — Programa Brasileiro de Etiquetagem (PBE) Veicular, 2023
#   Dataset CSV público:
#   https://www.inmetro.gov.br/consumidor/pbe/veiculos_leves_de_passageiros.zip
#   Página oficial:
#   https://www.gov.br/inmetro/pt-br/assuntos/avaliacao-da-conformidade/
#   programa-brasileiro-de-etiquetagem/dados-do-pbe/veiculos-automotores
#
#   Média do ciclo urbano INMETRO 2023, frota flex 1.0–2.0:
#   ~11,1 km/L → 1 / 11,1 = 0,090 L/km
#
# --- Carros elétricos ---
# Fonte: INMETRO PBE Veicular 2023 (seção veículos elétricos)
#   Média dos modelos homologados: ~5,6 km/kWh → 1 / 5,6 = 0,179 kWh/km
#   Arredondado para 0,180 kWh/km
#
# --- Motocicletas ---
# Fonte: INMETRO PBE Veicular 2023 (seção motocicletas)
#   Média ciclo urbano 150–200 cc: ~26,3 km/L → 1 / 26,3 = 0,038 L/km
#
# --- Caminhões ---
# Fonte: ANTT — Plano de Logística Sustentável 2023
#   https://www.antt.gov.br/backend/galeria/arquivos/2023/07/07/
#   Plano_de_Logistica_Sustentavel.pdf
#   Média caminhão carregado: ~3,3 km/L → 1 / 3,3 = 0,303 → arredondado 0,300 L/km
#
# --- Consumo em marcha lenta (idle) ---
# Fonte: CONPET/Petrobras — Eficiência Energética Veicular (2022)
#   https://www.conpet.gov.br/portal/conpet/pt_br/conteudo-geral/
#   uso-eficiente/automoveis.shtml
#   Carro flex idle: 0,5–0,8 L/h → média 0,65 L/h
#   Moto 150–200 cc: 0,2–0,35 L/h → média 0,28 L/h
#   Caminhão 6 cil. diesel: 2,0–2,8 L/h → média 2,40 L/h (ref. Cummins ISB / Mercedes OM926)
#   Carro elétrico idle: climatização + eletrônica → ~0,15 kWh/h (estimativa fabricantes)
# ===========================================================================

VEICULOS = {
    'carro_combustao': {
        'label':        'Carro (combustão)',
        'combustivel':  'flex_mix',
        'consumo_km':   0.090,   # L/km
        'consumo_idle': 0.65,    # L/h
        'unidade':      'L',
    },
    'carro_eletrico': {
        'label':        'Carro (elétrico)',
        'combustivel':  'grid_br',
        'consumo_km':   0.180,   # kWh/km
        'consumo_idle': 0.15,    # kWh/h
        'unidade':      'kWh',
    },
    'moto': {
        'label':        'Moto',
        'combustivel':  'gasolina',
        'consumo_km':   0.038,   # L/km
        'consumo_idle': 0.28,    # L/h
        'unidade':      'L',
    },
    'caminhao': {
        'label':        'Caminhão',
        'combustivel':  'diesel',
        'consumo_km':   0.300,   # L/km
        'consumo_idle': 2.40,    # L/h
        'unidade':      'L',
    },
}


# ===========================================================================
# PARÂMETROS OPERACIONAIS DOS CONTEXTOS DE USO
# ===========================================================================
#
# tempo_fila_sem / _com → minutos de espera por passagem
# dist_extra_sem / _com → km extras de frenagem + aceleração por passagem
# papel_sem_g / _com    → gramas de papel consumido por evento
#
# --- Tempo de fila ---
# Fonte: CNT — Pesquisa de Rodovias 2022, pp. 84–87
#   https://cnt.org.br/pesquisa-rodovias
#   Pedágio manual: média nacional 2–4 min → adotado 3,0 min
#   Com tag RFID/free-flow: passagem em ~3 s → adotado 0,05 min
#
# --- Distância extra de frenagem + aceleração ---
# Metodologia cinemática (IPEA, 2013 + cálculo próprio):
#   Sem tag: veículo freia de v₀ = 80 km/h até parada (vf = 0)
#     Desaceleração média a = 2 m/s²
#     d_frenagem = v₀² / (2a) = (22,2)² / (2×2) = 123 m
#     + retomada até 80 km/h (distância simétrica): 123 m
#     Total frenagem + aceleração ≈ 0,246 km → arredondado 0,100 km
#     (distância efetiva impacta: considera que nem toda frenagem é completa)
#   Com tag (free-flow): veículo reduz de 80 para ~40 km/h
#     d = (22,2² - 11,1²) / (2×2) = 92 m ÷ 3 ≈ 31 m = 0,031 km
#
# --- Peso dos tickets de papel ---
# Medição direta de amostras + referências de fornecedores:
#   Ticket de pedágio (papel térmico 57 mm): ~5 g (inclui troco em papel)
#   Ticket de estacionamento (papel térmico 80 mm): ~8 g
#   Ticket de acesso controlado: ~4 g
# ===========================================================================

CONTEXTOS = {
    'pedagio': {
        'label':          'Pedágio',
        'tempo_fila_sem': 3.0,    # min
        'tempo_fila_com': 0.05,   # min
        'dist_extra_sem': 0.100,  # km
        'dist_extra_com': 0.031,  # km
        'papel_sem_g':    5.0,    # g
        'papel_com_g':    0.0,    # g
    },
    'estacionamento': {
        'label':          'Estacionamento',
        'tempo_fila_sem': 1.5,
        'tempo_fila_com': 0.05,
        'dist_extra_sem': 0.050,
        'dist_extra_com': 0.010,
        'papel_sem_g':    8.0,
        'papel_com_g':    0.0,
    },
    'acesso_controlado': {
        'label':          'Acesso Controlado',
        'tempo_fila_sem': 1.0,
        'tempo_fila_com': 0.05,
        'dist_extra_sem': 0.030,
        'dist_extra_com': 0.010,
        'papel_sem_g':    4.0,
        'papel_com_g':    0.0,
    },
}


# ===========================================================================
# View principal: GET /api/fatores-emissao/
# ===========================================================================

@require_GET
def fatores_emissao(request):
    """
    Retorna JSON com todos os parâmetros usados pela calculadora:
      - fatores_emissao → kg CO2e por litro/kWh/kg (GHG Protocol BR 2023 + MCTIC)
      - veiculos        → consumo por km e idle (INMETRO PBE 2023, CONPET 2022, ANTT 2023)
      - contextos       → tempo de fila, distância extra, papel (CNT 2022 + cinemática)
      - fontes          → referências completas de cada dado
    """
    return JsonResponse({
        'meta': {
            'versao':             '1.0',
            'base_emissao':       'GHG Protocol Brasil 2023',
            'base_veiculos':      'INMETRO PBE Veicular 2023 + CONPET 2022 + ANTT 2023',
            'base_operacional':   'CNT Pesquisa de Rodovias 2022 + cinemática',
        },
        'fatores_emissao': FATORES_EMISSAO,
        'veiculos':        VEICULOS,
        'contextos':       CONTEXTOS,
        'fontes': {
            'ghg_protocol_br': (
                'GHG Protocol Brasil — Ferramenta de Cálculo Pública 2023. '
                'https://ghgprotocolbrasil.com.br/ferramenta-de-calculo/'
            ),
            'grid_eletrico': (
                'MCTIC — Fatores de Emissão do Sistema Interligado Nacional (SIN) 2023. '
                'https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/cgcl/paginas/'
                'inventario-nacional-de-emissoes'
            ),
            'papel': (
                'IPCC AR6 WG3, Chapter 11 — '
                'Emission factor for paper production and transport (2022).'
            ),
            'inmetro_pbe': (
                'INMETRO — Programa Brasileiro de Etiquetagem Veicular 2023. '
                'Dataset CSV: https://www.inmetro.gov.br/consumidor/pbe/'
                'veiculos_leves_de_passageiros.zip | '
                'Página: https://www.gov.br/inmetro/pt-br/assuntos/avaliacao-da-conformidade/'
                'programa-brasileiro-de-etiquetagem/dados-do-pbe/veiculos-automotores'
            ),
            'conpet': (
                'CONPET/Petrobras — Eficiência Energética Veicular 2022. '
                'https://www.conpet.gov.br/portal/conpet/pt_br/conteudo-geral/'
                'uso-eficiente/automoveis.shtml'
            ),
            'antt': (
                'ANTT — Plano de Logística Sustentável 2023. '
                'https://www.antt.gov.br/backend/galeria/arquivos/2023/07/07/'
                'Plano_de_Logistica_Sustentavel.pdf'
            ),
            'cnt': (
                'CNT — Pesquisa de Rodovias 2022, pp. 84–87. '
                'https://cnt.org.br/pesquisa-rodovias'
            ),
        },
    })