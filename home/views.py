from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from . import dados_empresas as DE


# =============================================================================
# Páginas HTML
# =============================================================================

def home(request):
    return render(request, 'home.html')


# =============================================================================
# Helper — tipo do usuário logado
# =============================================================================

def _get_tipo(user):
    """Retorna 'empresa' ou 'pessoa'. Seguro mesmo sem Perfil criado."""
    try:
        return user.perfil.tipo
    except Exception:
        return 'pessoa'


# =============================================================================
# Páginas protegidas por tipo de usuário
# =============================================================================

def meu_impacto(request):
    """Acessível apenas para usuários do tipo pessoa."""
    if not request.user.is_authenticated:
        return redirect('login')
    if _get_tipo(request.user) == 'empresa':
        return redirect('empresas_relatorios')
    return render(request, 'meu_impacto.html')


def metodologia(request):
    return render(request, 'metodologia.html')


def faq(request):
    return render(request, 'faq.html')


def empresas_relatorios(request):
    """Acessível apenas para usuários do tipo empresa."""
    if not request.user.is_authenticated:
        return redirect('login')
    if _get_tipo(request.user) == 'pessoa':
        return redirect('meu_impacto')
    return render(request, 'empresas_relatorios.html')


# =============================================================================
# FATORES DE EMISSÃO — GHG Protocol Brasil 2023
# =============================================================================

FATORES_EMISSAO = {
    'gasolina': 2.212, 'diesel': 2.603, 'etanol': 0.458,
    'flex_mix': 1.335, 'grid_br': 0.0817, 'papel': 1.100,
}

VEICULOS = {
    'carro_combustao': {'label': 'Carro (combustão)', 'combustivel': 'flex_mix',  'consumo_km': 0.090, 'consumo_idle': 0.65,  'unidade': 'L'},
    'carro_eletrico':  {'label': 'Carro (elétrico)',  'combustivel': 'grid_br',   'consumo_km': 0.180, 'consumo_idle': 0.15,  'unidade': 'kWh'},
    'moto':            {'label': 'Moto',              'combustivel': 'gasolina',  'consumo_km': 0.038, 'consumo_idle': 0.28,  'unidade': 'L'},
    'caminhao':        {'label': 'Caminhão',          'combustivel': 'diesel',    'consumo_km': 0.300, 'consumo_idle': 2.40,  'unidade': 'L'},
}

CONTEXTOS = {
    'pedagio':           {'label': 'Pedágio',           'tempo_fila_sem': 3.0,  'tempo_fila_com': 0.05, 'dist_extra_sem': 0.100, 'dist_extra_com': 0.031, 'papel_sem_g': 5.0, 'papel_com_g': 0.0},
    'estacionamento':    {'label': 'Estacionamento',    'tempo_fila_sem': 1.5,  'tempo_fila_com': 0.05, 'dist_extra_sem': 0.050, 'dist_extra_com': 0.010, 'papel_sem_g': 8.0, 'papel_com_g': 0.0},
    'acesso_controlado': {'label': 'Acesso Controlado', 'tempo_fila_sem': 1.0,  'tempo_fila_com': 0.05, 'dist_extra_sem': 0.030, 'dist_extra_com': 0.010, 'papel_sem_g': 4.0, 'papel_com_g': 0.0},
}

@require_GET
def fatores_emissao(request):
    return JsonResponse({
        'meta': {'versao': '1.0', 'base_emissao': 'GHG Protocol Brasil 2023'},
        'fatores_emissao': FATORES_EMISSAO,
        'veiculos': VEICULOS,
        'contextos': CONTEXTOS,
    })


# =============================================================================
# HELPERS — agregações sobre dados_empresas.py
# =============================================================================

MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

def _mult(filtro_lista, pesos_dict):
    itens = filtro_lista or list(pesos_dict)
    return sum(pesos_dict.get(i, 0) for i in itens)

def _co2e_mensal(ano, ctx_f, vei_f, est_f):
    total = DE.ANNUAL_TOTALS_KG.get(ano, 0)
    pesos = DE.MONTHLY_WEIGHTS.get(ano, {})
    base  = total * _mult(ctx_f, DE.CONTEXT_WEIGHTS) * _mult(vei_f, DE.VEHICLE_WEIGHTS) * _mult(est_f, DE.STATE_WEIGHTS)
    return [round(base * pesos.get(m + 1, 0)) for m in range(12)]

def _co2e_anual(ctx_f, vei_f, est_f):
    m = _mult(ctx_f, DE.CONTEXT_WEIGHTS) * _mult(vei_f, DE.VEHICLE_WEIGHTS) * _mult(est_f, DE.STATE_WEIGHTS)
    return {ano: round(total * m) for ano, total in DE.ANNUAL_TOTALS_KG.items()}

def _ranking_estados(ano, ctx_f, top_n):
    total = DE.ANNUAL_TOTALS_KG.get(ano, 0)
    mc    = _mult(ctx_f, DE.CONTEXT_WEIGHTS)
    lista = [{'uf': uf, 'nome': DE.STATE_NAMES.get(uf, uf), 'co2e_kg': round(total * peso * mc)} for uf, peso in DE.STATE_WEIGHTS.items()]
    lista.sort(key=lambda x: x['co2e_kg'], reverse=True)
    top = lista[:top_n]
    max_val = top[0]['co2e_kg'] if top else 1
    for i, item in enumerate(top):
        item['posicao']   = i + 1
        item['barra_pct'] = round(item['co2e_kg'] / max_val * 100)
    return top

def _distribuicao_contexto(ano, vei_f, est_f):
    total   = DE.ANNUAL_TOTALS_KG.get(ano, 0)
    total_p = DE.ANNUAL_PASSAGENS.get(ano, 0)
    mv, me  = _mult(vei_f, DE.VEHICLE_WEIGHTS), _mult(est_f, DE.STATE_WEIGHTS)
    return {ctx: {'label': DE.CONTEXT_LABELS[ctx], 'co2e_kg': round(total * peso * mv * me), 'passagens': round(total_p * peso * mv * me), 'pct': round(peso * 100)} for ctx, peso in DE.CONTEXT_WEIGHTS.items()}

def _distribuicao_veiculo(ano, ctx_f, est_f):
    total  = DE.ANNUAL_TOTALS_KG.get(ano, 0)
    mc, me = _mult(ctx_f, DE.CONTEXT_WEIGHTS), _mult(est_f, DE.STATE_WEIGHTS)
    return {vk: {'label': DE.VEHICLE_LABELS[vk], 'co2e_kg': round(total * peso * mc * me), 'pct': round(peso * 100)} for vk, peso in DE.VEHICLE_WEIGHTS.items()}

def _kpis(ano, ctx_f, vei_f, est_f):
    mc = _mult(ctx_f, DE.CONTEXT_WEIGHTS)
    mv = _mult(vei_f, DE.VEHICLE_WEIGHTS)
    me = _mult(est_f, DE.STATE_WEIGHTS)
    co2e_at = round(DE.ANNUAL_TOTALS_KG.get(ano, 0) * mc * mv * me)
    pass_at = round(DE.ANNUAL_PASSAGENS.get(ano, 0)  * mc * mv * me)
    est_n   = DE.ESTADOS_ATIVOS_POR_ANO.get(ano, 0)
    rank_inf = DE.RANKING_NACIONAL.get(ano, {})
    ano_ant  = ano - 1
    co2e_an = DE.ANNUAL_TOTALS_KG.get(ano_ant, co2e_at)
    pass_an = DE.ANNUAL_PASSAGENS.get(ano_ant, pass_at)
    est_an  = DE.ESTADOS_ATIVOS_POR_ANO.get(ano_ant, est_n)
    rank_an = DE.RANKING_NACIONAL.get(ano_ant, {}).get('posicao', rank_inf.get('posicao', 0))
    def trend_pct(atual, ant): return round((atual - ant) / ant * 100, 1) if ant else 0
    return {
        'co2e_evitado':   {'valor_kg': co2e_at, 'valor_ton': round(co2e_at / 1000, 2), 'trend_pct': trend_pct(co2e_at, co2e_an), 'trend_dir': 'up' if co2e_at >= co2e_an else 'down'},
        'passagens':      {'valor': pass_at, 'trend_pct': trend_pct(pass_at, pass_an), 'trend_dir': 'up' if pass_at >= pass_an else 'down'},
        'estados_ativos': {'valor': est_n, 'trend_abs': est_n - est_an, 'trend_dir': 'up' if est_n >= est_an else 'down'},
        'ranking_nacional':{'posicao': rank_inf.get('posicao'), 'grupo': rank_inf.get('grupo'), 'trend_abs': rank_an - rank_inf.get('posicao', rank_an), 'trend_dir': 'up' if rank_an >= rank_inf.get('posicao', rank_an) else 'down'},
    }

def _meta_vs_realizado(ano):
    meta   = DE.METAS_ANUAIS_KG.get(ano, 0)
    realiz = DE.ANNUAL_TOTALS_KG.get(ano, 0)
    return {'meta_kg': meta, 'realizado_kg': realiz, 'pct_atingido': round(realiz / meta * 100, 1) if meta else 0, 'status': 'atingida' if realiz >= meta else 'em_progresso'}


# =============================================================================
# ENDPOINT: GET /api/empresas/dados/
# =============================================================================

@require_GET
def api_empresas_dados(request):
    try:
        ano = int(request.GET.get('ano', 2025))
        ano = ano if ano in DE.ANNUAL_TOTALS_KG else 2025
    except ValueError:
        ano = 2025

    try:
        top_n = max(1, min(int(request.GET.get('top_n', 8)), len(DE.STATE_WEIGHTS)))
    except ValueError:
        top_n = 8

    def parse_lista(param, validos):
        raw    = request.GET.get(param, '')
        parsed = [x.strip() for x in raw.split(',') if x.strip() in validos]
        return parsed if parsed else None

    ctx_f = parse_lista('contexto', DE.CONTEXT_WEIGHTS)
    vei_f = parse_lista('veiculo',  DE.VEHICLE_WEIGHTS)
    est_f = parse_lista('estado',   {k.upper(): v for k, v in DE.STATE_WEIGHTS.items()})

    mensal = _co2e_mensal(ano, ctx_f, vei_f, est_f)
    anual  = _co2e_anual(ctx_f, vei_f, est_f)

    return JsonResponse({
        'empresa':               DE.EMPRESA_PERFIL,
        'filtros_opcoes':        DE.FILTROS_OPCOES,
        'filtros_ativos':        {'ano': ano, 'contextos': ctx_f or list(DE.CONTEXT_WEIGHTS), 'veiculos': vei_f or list(DE.VEHICLE_WEIGHTS), 'estados': est_f or list(DE.STATE_WEIGHTS)},
        'kpis':                  _kpis(ano, ctx_f, vei_f, est_f),
        'evolucao_mensal':       {'labels': MESES_LABEL, 'ano': ano, 'series_kg': mensal, 'total_kg': sum(mensal)},
        'evolucao_anual':        {'labels': list(anual.keys()), 'series_kg': list(anual.values()), 'series_ton': [round(v / 1000, 2) for v in anual.values()], 'metas_kg': [DE.METAS_ANUAIS_KG.get(a, 0) for a in anual]},
        'distribuicao_contexto': _distribuicao_contexto(ano, vei_f, est_f),
        'distribuicao_veiculo':  _distribuicao_veiculo(ano, ctx_f, est_f),
        'ranking_estados':       _ranking_estados(ano, ctx_f, top_n),
        'meta_vs_realizado':     _meta_vs_realizado(ano),
        'equivalencias':         DE.EQUIVALENCIAS_2025 if ano == 2025 else {'arvores_ano': round(DE.ANNUAL_TOTALS_KG.get(ano, 0) / 21.77), 'litros_gasolina': round(DE.ANNUAL_TOTALS_KG.get(ano, 0) / 2.212), 'papel_kg_total': round(DE.ANNUAL_PASSAGENS.get(ano, 0) * 0.00455), 'tempo_fila_horas': round(DE.ANNUAL_PASSAGENS.get(ano, 0) * 3 / 60 * 0.62)},
        'ranking_mensal':        {'labels': MESES_LABEL, 'series': DE.RANKING_MENSAL_2025 if ano == 2025 else []},
    })