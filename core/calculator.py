"""
Módulo de cálculo de emissões de CO2 - TagGreen Metodologia v1.0
Fatores baseados em dados oficiais do IPCC, SEEG e ONS 2023.
"""

# Fatores de emissão
FATOR_PAPEL = 1.100        # kg CO2e/kg de papel
PAPEL_GRAMAS = 12          # g de papel por passagem sem tag
FATOR_GASOLINA = 2.212     # kg CO2e/L de gasolina
ABSORCAO_ARVORE = 21.77    # kg CO2 absorvidos por árvore/ano
FATOR_ELETRICO_SIN = 0.0817  # kg CO2e/kWh (Grid SIN 2023)

# Parâmetros dos veículos
VEHICLE_PARAMS = {
    'combustao': {
        'consumo_km': 0.090,   # L/km
        'consumo_idle': 0.65,  # L/h em marcha lenta
        'fator_emissao': 1.335,  # kg CO2e/L
        'label': 'Carro (Combustão)',
        'fuel_unit': 'L',
    },
    'eletrico': {
        'consumo_km': 0.180,    # kWh/km
        'consumo_idle': 0.15,   # kWh/h parado
        'fator_emissao': FATOR_ELETRICO_SIN,  # kg CO2e/kWh
        'label': 'Carro Elétrico',
        'fuel_unit': 'kWh',
    },
    'moto': {
        'consumo_km': 0.038,   # L/km
        'consumo_idle': 0.28,  # L/h
        'fator_emissao': 2.212,  # kg CO2e/L
        'label': 'Moto',
        'fuel_unit': 'L',
    },
    'caminhao': {
        'consumo_km': 0.300,   # L/km
        'consumo_idle': 2.40,  # L/h
        'fator_emissao': 2.603,  # kg CO2e/L
        'label': 'Caminhão',
        'fuel_unit': 'L',
    },
}

# Parâmetros de contexto
CONTEXT_PARAMS = {
    'pedagio': {
        'tempo_sem': 3.0,    # minutos sem tag
        'tempo_com': 0.05,   # minutos com tag
        'dist_sem': 0.10,    # km extra sem tag
        'dist_com': 0.0,     # km extra com tag
        'label': 'Pedágio',
    },
    'estacionamento': {
        'tempo_sem': 1.5,
        'tempo_com': 0.05,
        'dist_sem': 0.05,
        'dist_com': 0.0,
        'label': 'Estacionamento',
    },
    'acesso': {
        'tempo_sem': 1.0,
        'tempo_com': 0.05,
        'dist_sem': 0.03,
        'dist_com': 0.0,
        'label': 'Controle de Acesso',
    },
}


def calcular_emissao_passagem(vehicle_type: str, context_type: str) -> dict:
    """Calcula emissão de CO2 por passagem sem e com tag."""
    vp = VEHICLE_PARAMS[vehicle_type]
    cp = CONTEXT_PARAMS[context_type]

    # Emissão SEM tag
    e_idle_sem = (cp['tempo_sem'] / 60) * vp['consumo_idle'] * vp['fator_emissao']
    e_mov_sem = cp['dist_sem'] * vp['consumo_km'] * vp['fator_emissao']
    e_papel_sem = (PAPEL_GRAMAS / 1000) * FATOR_PAPEL
    e_total_sem = e_idle_sem + e_mov_sem + e_papel_sem

    # Emissão COM tag
    e_idle_com = (cp['tempo_com'] / 60) * vp['consumo_idle'] * vp['fator_emissao']
    e_mov_com = cp['dist_com'] * vp['consumo_km'] * vp['fator_emissao']
    e_total_com = e_idle_com + e_mov_com

    # Economia por passagem
    economia = e_total_sem - e_total_com
    reducao_pct = (economia / e_total_sem * 100) if e_total_sem > 0 else 0

    # Tempo economizado (minutos)
    tempo_economizado = cp['tempo_sem'] - cp['tempo_com']

    # Combustível economizado
    combustivel_sem = (cp['tempo_sem'] / 60) * vp['consumo_idle'] + cp['dist_sem'] * vp['consumo_km']
    combustivel_com = (cp['tempo_com'] / 60) * vp['consumo_idle'] + cp['dist_com'] * vp['consumo_km']
    combustivel_economizado = combustivel_sem - combustivel_com

    return {
        'emissao_sem': round(e_total_sem, 4),
        'emissao_com': round(e_total_com, 4),
        'economia_kg': round(economia, 4),
        'reducao_pct': round(reducao_pct, 1),
        'tempo_economizado_min': round(tempo_economizado, 2),
        'combustivel_economizado': round(combustivel_economizado, 4),
        'papel_evitado_g': PAPEL_GRAMAS,
    }


def calcular_mensal(vehicle_type: str, context_type: str, passagens: int) -> dict:
    """Calcula economia total mensal para N passagens."""
    por_passagem = calcular_emissao_passagem(vehicle_type, context_type)

    co2_economizado = por_passagem['economia_kg'] * passagens
    tempo_economizado = por_passagem['tempo_economizado_min'] * passagens
    combustivel_economizado = por_passagem['combustivel_economizado'] * passagens
    papel_evitado_g = por_passagem['papel_evitado_g'] * passagens

    # Equivalências
    arvores_equivalentes = co2_economizado / (ABSORCAO_ARVORE / 12)  # por mês
    distancia_equivalente = combustivel_economizado / VEHICLE_PARAMS[vehicle_type]['consumo_km'] if VEHICLE_PARAMS[vehicle_type]['consumo_km'] > 0 else 0

    vp = VEHICLE_PARAMS[vehicle_type]

    return {
        'co2_economizado_kg': round(co2_economizado, 3),
        'reducao_pct': round(por_passagem['reducao_pct'], 1),
        'tempo_economizado_min': round(tempo_economizado, 1),
        'combustivel_economizado': round(combustivel_economizado, 2),
        'combustivel_unit': vp['fuel_unit'],
        'papel_evitado_g': round(papel_evitado_g, 0),
        'papel_evitado_folhas': round(papel_evitado_g / PAPEL_GRAMAS, 0),
        'arvores_equivalentes': round(arvores_equivalentes, 2),
        'distancia_equivalente_km': round(distancia_equivalente, 1),
        'passagens': passagens,
        'vehicle_type': vehicle_type,
        'context_type': context_type,
        'vehicle_label': vp['label'],
        'context_label': CONTEXT_PARAMS[context_type]['label'],
        'por_passagem': por_passagem,
    }
