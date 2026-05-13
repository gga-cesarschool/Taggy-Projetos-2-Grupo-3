# =============================================================================
# dados_empresas.py
# Dados simulados para o Painel ESG Corporativo — TagGreen / Taggy
#
# Estrutura:
#   - EMPRESA_PERFIL          → dados cadastrais da empresa
#   - ANNUAL_TOTALS_KG        → CO2e evitado total por ano (kg)
#   - MONTHLY_WEIGHTS         → distribuição mensal por ano (proporções)
#   - STATE_WEIGHTS           → distribuição por estado
#   - CONTEXT_WEIGHTS         → distribuição por contexto (pedágio / estacionamento / acesso)
#   - VEHICLE_WEIGHTS         → distribuição por tipo de veículo
#   - RANKING_NACIONAL        → histórico de ranking nacional ESG
#   - PASSAGENS_POR_KG_CO2E   → passagens médias por kg CO2e evitado (por contexto)
#   - ESTADOS_ATIVOS_POR_ANO  → quantidade de estados com operação ativa
# =============================================================================

# -----------------------------------------------------------------------------
# Perfil da empresa (dados fictícios para exibição no dashboard)
# -----------------------------------------------------------------------------
EMPRESA_PERFIL = {
    'nome':          'TechLog Brasil S/A',
    'cnpj':          '12.345.678/0001-90',
    'setor':         'Logística e Transporte',
    'frota_total':   512,              # veículos ativos com Taggy
    'contrato_desde': '2022-03-01',
    'plano':         'Corporativo Pro',
    'contato':       'esg@techlogbrasil.com.br',
}

# -----------------------------------------------------------------------------
# CO2e evitado total por ano (kg)
# Os valores de 2025 são parciais (acumulado até o mês corrente)
# Nota: 1 ton = 1000 kg
# -----------------------------------------------------------------------------
ANNUAL_TOTALS_KG = {
    2022: 8_500,
    2023: 13_200,
    2024: 19_800,
    2025: 16_490,   # acumulado Jan–Dez 2025 (projeção encerrada)
}

# Passagens totais por ano
ANNUAL_PASSAGENS = {
    2022: 236_000,
    2023: 326_000,
    2024: 502_000,
    2025: 455_000,
}

# -----------------------------------------------------------------------------
# Distribuição mensal (pesos proporcionais, somam 1.0 por ano)
# Refletem sazonalidade: férias de jan, pico de fim de ano, etc.
# -----------------------------------------------------------------------------
MONTHLY_WEIGHTS = {
    2025: {
        1: 0.041,  # Jan — pós-férias, volume baixo
        2: 0.049,
        3: 0.056,
        4: 0.061,
        5: 0.065,
        6: 0.071,
        7: 0.078,  # Jul — férias, movimento maior
        8: 0.086,
        9: 0.094,
        10: 0.103,
        11: 0.112,
        12: 0.124, # Dez — pico fim de ano
    },
    2024: {
        1: 0.044, 2: 0.051, 3: 0.058, 4: 0.063, 5: 0.068,
        6: 0.074, 7: 0.082, 8: 0.088, 9: 0.095, 10: 0.105,
        11: 0.114, 12: 0.158,
    },
    2023: {
        1: 0.048, 2: 0.054, 3: 0.060, 4: 0.065, 5: 0.070,
        6: 0.076, 7: 0.083, 8: 0.090, 9: 0.097, 10: 0.107,
        11: 0.115, 12: 0.135,
    },
    2022: {
        1: 0.050, 2: 0.056, 3: 0.062, 4: 0.068, 5: 0.073,
        6: 0.079, 7: 0.086, 8: 0.093, 9: 0.099, 10: 0.109,
        11: 0.117, 12: 0.108,
    },
}

# -----------------------------------------------------------------------------
# Distribuição por contexto de uso
# Proporcional ao número de passagens e CO2e evitado
# -----------------------------------------------------------------------------
CONTEXT_WEIGHTS = {
    'pedagio':           0.62,
    'estacionamento':    0.25,
    'acesso_controlado': 0.13,
}

CONTEXT_LABELS = {
    'pedagio':           'Pedágio',
    'estacionamento':    'Estacionamento',
    'acesso_controlado': 'Acesso Controlado',
}

# -----------------------------------------------------------------------------
# Distribuição por tipo de veículo (frota da empresa)
# -----------------------------------------------------------------------------
VEHICLE_WEIGHTS = {
    'carro_combustao': 0.62,
    'carro_eletrico':  0.09,
    'moto':            0.19,
    'caminhao':        0.10,
}

VEHICLE_LABELS = {
    'carro_combustao': 'Carro (combustão)',
    'carro_eletrico':  'Carro (elétrico)',
    'moto':            'Moto',
    'caminhao':        'Caminhão',
}

# -----------------------------------------------------------------------------
# Distribuição por estado (pesos por volume de passagens)
# Top 8 estados somam ~95% do volume
# -----------------------------------------------------------------------------
STATE_WEIGHTS = {
    'SP': 0.2730, 'RJ': 0.1760, 'MG': 0.1394,
    'PR': 0.1152, 'RS': 0.0970, 'BA': 0.0728,
    'SC': 0.0668, 'GO': 0.0546,
    'ES': 0.0090, 'CE': 0.0077, 'PE': 0.0065,
    'MT': 0.0053, 'MS': 0.0041, 'AM': 0.0029,
    'PA': 0.0029, 'DF': 0.0023, 'RN': 0.0023,
    'PB': 0.0023, 'AL': 0.0012, 'SE': 0.0012,
    'PI': 0.0006, 'MA': 0.0006,
}

STATE_NAMES = {
    'SP': 'São Paulo',    'RJ': 'Rio de Janeiro', 'MG': 'Minas Gerais',
    'PR': 'Paraná',       'RS': 'Rio Grande do Sul', 'BA': 'Bahia',
    'SC': 'Santa Catarina','GO': 'Goiás',          'ES': 'Espírito Santo',
    'CE': 'Ceará',        'PE': 'Pernambuco',      'MT': 'Mato Grosso',
    'MS': 'Mato Grosso do Sul', 'AM': 'Amazonas',  'PA': 'Pará',
    'DF': 'Distrito Federal',   'RN': 'Rio Grande do Norte',
    'PB': 'Paraíba',      'AL': 'Alagoas',         'SE': 'Sergipe',
    'PI': 'Piauí',        'MA': 'Maranhão',
}

# Quantos estados estavam ativos por ano
ESTADOS_ATIVOS_POR_ANO = {
    2022: 14,
    2023: 18,
    2024: 21,
    2025: 22,
}

# -----------------------------------------------------------------------------
# Ranking nacional ESG (posição entre empresas clientes Taggy)
# -----------------------------------------------------------------------------
RANKING_NACIONAL = {
    2022: {'posicao': 12, 'grupo': 'Top 20'},
    2023: {'posicao':  8, 'grupo': 'Top 10'},
    2024: {'posicao':  5, 'grupo': 'Top 5'},
    2025: {'posicao':  4, 'grupo': 'Top 5'},
}

# Tendência mês a mês no ranking (Janeiro→Dezembro 2025)
RANKING_MENSAL_2025 = [6, 6, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4]

# -----------------------------------------------------------------------------
# Metas ESG anuais (kg CO2e evitado)
# -----------------------------------------------------------------------------
METAS_ANUAIS_KG = {
    2022: 7_000,
    2023: 10_000,
    2024: 17_000,
    2025: 18_000,
}

# -----------------------------------------------------------------------------
# Resumo dos dados por contexto para o ano de referência (2025)
# Usado no card de distribuição e detalhes
# -----------------------------------------------------------------------------
CONTEXTO_DETALHES_2025 = {
    'pedagio': {
        'co2e_kg':      10_224,
        'passagens':   282_100,
        'papel_evitado_kg': 1_411,  # 282100 × 5g / 1000
        'tempo_fila_evitado_h': 14_105,  # 282100 × 3min / 60
    },
    'estacionamento': {
        'co2e_kg':       4_123,
        'passagens':   113_750,
        'papel_evitado_kg': 910,
        'tempo_fila_evitado_h': 2_844,
    },
    'acesso_controlado': {
        'co2e_kg':       2_143,
        'passagens':    59_150,
        'papel_evitado_kg': 237,
        'tempo_fila_evitado_h':   986,
    },
}

# -----------------------------------------------------------------------------
# Equivalências do CO2e total 2025 (16.490 kg)
# Usadas na seção "Wrapped" e em destaques do relatório
# -----------------------------------------------------------------------------
EQUIVALENCIAS_2025 = {
    'arvores_ano':        round(16_490 / 21.77),  # ~757 árvores/ano
    'litros_gasolina':    round(16_490 / 2.212),  # ~7.453 L
    'km_carro':           round((16_490 / 2.212) / 0.090),  # km não percorridos em idle
    'refeicoes_co2':      round(16_490 / 0.4),    # equivalência alimentar (estimativa)
    'papel_kg_total':     round(1_411 + 910 + 237),  # 2.558 kg de papel evitado
    'tempo_fila_horas':   round(14_105 + 2_844 + 986),  # 17.935 h de fila evitadas
}

# -----------------------------------------------------------------------------
# Opções disponíveis nos filtros da UI
# -----------------------------------------------------------------------------
FILTROS_OPCOES = {
    'anos': [2022, 2023, 2024, 2025],
    'meses': [
        {'valor': 1,  'label': 'Janeiro'},
        {'valor': 2,  'label': 'Fevereiro'},
        {'valor': 3,  'label': 'Março'},
        {'valor': 4,  'label': 'Abril'},
        {'valor': 5,  'label': 'Maio'},
        {'valor': 6,  'label': 'Junho'},
        {'valor': 7,  'label': 'Julho'},
        {'valor': 8,  'label': 'Agosto'},
        {'valor': 9,  'label': 'Setembro'},
        {'valor': 10, 'label': 'Outubro'},
        {'valor': 11, 'label': 'Novembro'},
        {'valor': 12, 'label': 'Dezembro'},
    ],
    'estados': [
        {'uf': uf, 'nome': STATE_NAMES[uf]}
        for uf in sorted(STATE_WEIGHTS.keys())
    ],
    'contextos': [
        {'valor': k, 'label': v}
        for k, v in CONTEXT_LABELS.items()
    ],
    'veiculos': [
        {'valor': k, 'label': v}
        for k, v in VEHICLE_LABELS.items()
    ],
}