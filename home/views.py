import json
from datetime import date as date_cls

from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST

from . import dados_empresas as DE
from .models import Veiculo, VeiculoEmpresa, Passagem


# =============================================================================
# Páginas HTML
# =============================================================================

def home(request):
    return render(request, 'home.html')


def _get_tipo(user):
    try:
        return user.perfil.tipo
    except Exception:
        return 'pessoa'


def meu_impacto(request):
    if not request.user.is_authenticated:
        return redirect('login')
    if _get_tipo(request.user) == 'empresa':
        return redirect('empresas_relatorios')
    return render(request, 'meu_impacto.html', {
        'nome_usuario': request.user.first_name or request.user.email.split('@')[0],
    })


def metodologia(request):
    return render(request, 'metodologia.html')

def faq(request):
    return render(request, 'faq.html')

def empresas_relatorios(request):
    if not request.user.is_authenticated:
        return redirect('login')
    if _get_tipo(request.user) == 'pessoa':
        return redirect('meu_impacto')
    return render(request, 'empresas_relatorios.html')


# =============================================================================
# CÁLCULO DE CO₂E — espelha a metodologia da página Metodologia
# =============================================================================

CALC_FATORES = {
    'gasolina': 2.212, 'diesel': 2.603, 'etanol': 0.458,
    'flex_mix': 1.335, 'grid_br': 0.0817, 'papel':  1.100,
}
CALC_VEICULOS = {
    'carro_combustao': {'combustivel': 'flex_mix',  'consumo_km': 0.090, 'consumo_idle': 0.65},
    'carro_eletrico':  {'combustivel': 'grid_br',   'consumo_km': 0.180, 'consumo_idle': 0.15},
    'moto':            {'combustivel': 'gasolina',  'consumo_km': 0.038, 'consumo_idle': 0.28},
    'caminhao':        {'combustivel': 'diesel',    'consumo_km': 0.300, 'consumo_idle': 2.40},
}
CALC_CONTEXTOS = {
    'pedagio':           {'tempo_sem': 3.0, 'tempo_com': 0.05, 'dist_sem': 0.100, 'dist_com': 0.031, 'papel_sem': 5.0},
    'estacionamento':    {'tempo_sem': 1.5, 'tempo_com': 0.05, 'dist_sem': 0.050, 'dist_com': 0.010, 'papel_sem': 8.0},
    'acesso_controlado': {'tempo_sem': 1.0, 'tempo_com': 0.05, 'dist_sem': 0.030, 'dist_com': 0.010, 'papel_sem': 4.0},
}


def calcular_co2e_passagem(tipo_veiculo: str, contexto: str) -> float:
    """Retorna CO₂e evitado por passagem individual (em kg)."""
    v = CALC_VEICULOS.get(tipo_veiculo)
    c = CALC_CONTEXTOS.get(contexto)
    if not v or not c:
        return 0.0
    fator = CALC_FATORES[v['combustivel']]
    e_sem = (c['tempo_sem'] / 60) * v['consumo_idle'] * fator \
          + c['dist_sem'] * v['consumo_km'] * fator \
          + (c['papel_sem'] / 1000) * CALC_FATORES['papel']
    e_com = (c['tempo_com'] / 60) * v['consumo_idle'] * fator \
          + c['dist_com'] * v['consumo_km'] * fator
    return round(e_sem - e_com, 6)


# =============================================================================
# HELPER — autenticação em endpoints JSON
# =============================================================================

def _auth_required(request):
    if not request.user.is_authenticated:
        return JsonResponse({'ok': False, 'erro': 'Não autenticado.'}, status=401)
    return None


# =============================================================================
# DASHBOARD — dados reais do usuário
# =============================================================================

MESES_LABEL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
               'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']


@require_GET
def api_meu_impacto_dados(request):
    """KPIs e dados dos gráficos calculados a partir das passagens reais."""
    err = _auth_required(request)
    if err:
        return err

    hoje          = date_cls.today()
    primeiro_mes  = hoje.replace(day=1)
    ano_atual     = hoje.year

    todas = list(
        Passagem.objects.filter(usuario=request.user)
        .select_related('veiculo')
        .order_by('data')
    )

    # ── KPIs do mês ─────────────────────────────────────────────────────────
    do_mes   = [p for p in todas if p.data >= primeiro_mes]
    co2e_mes = sum(p.co2e_total for p in do_mes)
    qtd_mes  = sum(p.quantidade for p in do_mes)
    tempo_mes = sum(
        p.quantidade * (CALC_CONTEXTOS[p.contexto]['tempo_sem'] - CALC_CONTEXTOS[p.contexto]['tempo_com'])
        for p in do_mes
        if p.contexto in CALC_CONTEXTOS
    )

    # ── Total acumulado ──────────────────────────────────────────────────────
    co2e_total = sum(p.co2e_total for p in todas)

    # ── Gráfico mensal (ano atual) ───────────────────────────────────────────
    mensal = [0.0] * 12
    for p in todas:
        if p.data.year == ano_atual:
            mensal[p.data.month - 1] = round(mensal[p.data.month - 1] + p.co2e_total, 4)

    # ── Gráfico anual ────────────────────────────────────────────────────────
    anual_dict: dict[int, float] = {}
    for p in todas:
        anual_dict[p.data.year] = round(anual_dict.get(p.data.year, 0) + p.co2e_total, 4)
    anos  = sorted(anual_dict) or [ano_atual]
    vals  = [anual_dict[a] for a in anos]

    # ── Últimas passagens (histórico recente) ────────────────────────────────
    recentes = []
    for p in reversed(todas[-20:]):
        empresa_nome = ''
        try:
            if p.empresa:
                empresa_nome = p.empresa.perfil.nome_empresa
        except Exception:
            pass
        recentes.append({
            'id':         p.id,
            'veiculo':    p.veiculo.nome,
            'contexto':   p.get_contexto_display(),
            'data':       p.data.isoformat(),
            'quantidade': p.quantidade,
            'co2e_total': round(p.co2e_total, 4),
            'empresa':    empresa_nome,
        })

    return JsonResponse({
        'ok': True,
        'nome': request.user.first_name or request.user.email.split('@')[0],
        'kpis': {
            'co2e_mes':   round(co2e_mes, 3),
            'qtd_mes':    qtd_mes,
            'co2e_total': round(co2e_total, 3),
            'tempo_mes':  round(tempo_mes, 1),
        },
        'grafico_mensal': {'labels': MESES_LABEL, 'data': mensal},
        'grafico_anual':  {'labels': [str(a) for a in anos], 'data': vals},
        'recentes':       recentes,
    })


# =============================================================================
# PASSAGENS — CRUD
# =============================================================================

@require_GET
def api_passagens_lista(request):
    """Lista as passagens do usuário paginadas (50 mais recentes)."""
    err = _auth_required(request)
    if err:
        return err

    passagens = Passagem.objects.filter(usuario=request.user).select_related('veiculo', 'empresa__perfil')[:50]
    data = []
    for p in passagens:
        empresa_nome = ''
        try:
            if p.empresa:
                empresa_nome = p.empresa.perfil.nome_empresa
        except Exception:
            pass
        data.append({
            'id':              p.id,
            'veiculo_id':      p.veiculo.id,
            'veiculo_nome':    p.veiculo.nome,
            'veiculo_tipo':    p.veiculo.tipo,
            'veiculo_icon':    p.veiculo.icon,
            'contexto':        p.contexto,
            'contexto_label':  p.get_contexto_display(),
            'data':            p.data.isoformat(),
            'quantidade':      p.quantidade,
            'co2e_por_passagem': float(p.co2e_por_passagem),
            'co2e_total':      round(p.co2e_total, 4),
            'empresa_nome':    empresa_nome,
        })
    return JsonResponse({'ok': True, 'passagens': data})


@require_POST
def api_passagem_registrar(request):
    """Registra uma ou mais passagens com CO₂e calculado automaticamente."""
    err = _auth_required(request)
    if err:
        return err

    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'ok': False, 'erro': 'JSON inválido.'}, status=400)

    veiculo_id = body.get('veiculo_id')
    contexto   = body.get('contexto', '')
    data_str   = body.get('data', '')
    quantidade = body.get('quantidade', 1)
    empresa_id = body.get('empresa_id')

    # Validações
    if not veiculo_id:
        return JsonResponse({'ok': False, 'erro': 'Selecione um veículo.'})
    if contexto not in CALC_CONTEXTOS:
        return JsonResponse({'ok': False, 'erro': 'Contexto inválido.'})
    try:
        quantidade = int(quantidade)
        assert 1 <= quantidade <= 200
    except Exception:
        return JsonResponse({'ok': False, 'erro': 'Quantidade deve ser entre 1 e 200.'})

    try:
        veiculo = request.user.veiculos.get(id=int(veiculo_id), ativo=True)
    except Veiculo.DoesNotExist:
        return JsonResponse({'ok': False, 'erro': 'Veículo não encontrado.'}, status=404)

    try:
        data = date_cls.fromisoformat(data_str) if data_str else date_cls.today()
    except ValueError:
        data = date_cls.today()

    empresa = None
    if empresa_id:
        try:
            empresa = User.objects.get(id=int(empresa_id), perfil__tipo='empresa')
        except Exception:
            pass

    co2e = calcular_co2e_passagem(veiculo.tipo, contexto)

    passagem = Passagem.objects.create(
        usuario=request.user,
        veiculo=veiculo,
        empresa=empresa,
        contexto=contexto,
        data=data,
        quantidade=quantidade,
        co2e_por_passagem=co2e,
    )

    return JsonResponse({
        'ok':         True,
        'id':         passagem.id,
        'co2e_total': round(passagem.co2e_total, 4),
        'mensagem':   f'{quantidade} passagem(ns) registrada(s). +{round(passagem.co2e_total * 1000, 1)} g CO₂e evitados.',
    })


@require_POST
def api_passagem_excluir(request, passagem_id):
    """Exclui uma passagem do usuário."""
    err = _auth_required(request)
    if err:
        return err

    try:
        passagem = Passagem.objects.get(id=passagem_id, usuario=request.user)
    except Passagem.DoesNotExist:
        return JsonResponse({'ok': False, 'erro': 'Passagem não encontrada.'}, status=404)

    passagem.delete()
    return JsonResponse({'ok': True})


# =============================================================================
# VEÍCULOS — CRUD
# =============================================================================

TIPOS_VALIDOS = ['carro_combustao', 'carro_eletrico', 'moto', 'caminhao']


@require_GET
def api_veiculos_lista(request):
    err = _auth_required(request)
    if err:
        return err

    veiculos = (
        request.user.veiculos
        .filter(ativo=True)
        .prefetch_related('empresas_cadastradas__empresa__perfil')
    )
    data = []
    for v in veiculos:
        data.append({
            'id':         v.id,
            'nome':       v.nome,
            'tipo':       v.tipo,
            'tipo_label': v.get_tipo_display(),
            'icon':       v.icon,
            'placa':      v.placa,
            'empresas': [
                {
                    'id':                  ve.empresa.id,
                    'nome':                ve.empresa.perfil.nome_empresa,
                    'tipo_servico':        ve.empresa.perfil.tipo_servico,
                    'tipo_servico_label':  ve.empresa.perfil.get_tipo_servico_display(),
                }
                for ve in v.empresas_cadastradas.all()
            ],
        })
    return JsonResponse({'ok': True, 'veiculos': data})


@require_POST
def api_veiculo_salvar(request):
    err = _auth_required(request)
    if err:
        return err

    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'ok': False, 'erro': 'JSON inválido.'}, status=400)

    veiculo_id  = body.get('id')
    nome        = body.get('nome', '').strip()
    tipo        = body.get('tipo', '')
    placa       = body.get('placa', '').strip().upper()
    empresa_ids = body.get('empresas', [])

    if not nome:
        return JsonResponse({'ok': False, 'erro': 'Informe o nome do veículo.'})
    if tipo not in TIPOS_VALIDOS:
        return JsonResponse({'ok': False, 'erro': 'Tipo de veículo inválido.'})

    if veiculo_id:
        try:
            veiculo = request.user.veiculos.get(id=veiculo_id)
        except Veiculo.DoesNotExist:
            return JsonResponse({'ok': False, 'erro': 'Veículo não encontrado.'}, status=404)
        veiculo.nome  = nome
        veiculo.tipo  = tipo
        veiculo.placa = placa
        veiculo.save()
    else:
        veiculo = Veiculo.objects.create(usuario=request.user, nome=nome, tipo=tipo, placa=placa)

    veiculo.empresas_cadastradas.all().delete()
    for eid in empresa_ids:
        try:
            empresa = User.objects.get(id=int(eid), perfil__tipo='empresa')
            VeiculoEmpresa.objects.get_or_create(veiculo=veiculo, empresa=empresa)
        except Exception:
            pass

    return JsonResponse({'ok': True, 'id': veiculo.id})


@require_POST
def api_veiculo_excluir(request, veiculo_id):
    err = _auth_required(request)
    if err:
        return err
    try:
        veiculo = request.user.veiculos.get(id=veiculo_id)
    except Veiculo.DoesNotExist:
        return JsonResponse({'ok': False, 'erro': 'Veículo não encontrado.'}, status=404)
    veiculo.delete()
    return JsonResponse({'ok': True})


@require_GET
def api_empresas_lista(request):
    empresas = (
        User.objects
        .filter(perfil__tipo='empresa')
        .select_related('perfil')
        .order_by('perfil__nome_empresa')
    )
    GRUPOS = {
        'pedagio': 'Pedágio', 'estacionamento': 'Estacionamento',
        'acesso_controlado': 'Acesso Controlado', 'multiplo': 'Múltiplos Serviços',
    }
    grupos = {k: {'label': v, 'items': []} for k, v in GRUPOS.items()}
    for u in empresas:
        ts = u.perfil.tipo_servico or 'multiplo'
        if ts not in grupos:
            ts = 'multiplo'
        grupos[ts]['items'].append({'id': u.id, 'nome': u.perfil.nome_empresa})
    grupos = {k: v for k, v in grupos.items() if v['items']}
    return JsonResponse({'ok': True, 'grupos': grupos})


# =============================================================================
# FATORES DE EMISSÃO (público)
# =============================================================================

FATORES_EMISSAO = {
    'gasolina': 2.212, 'diesel': 2.603, 'etanol': 0.458,
    'flex_mix': 1.335, 'grid_br': 0.0817, 'papel': 1.100,
}

VEICULOS_CALC = {
    'carro_combustao': {'label': 'Carro (combustão)', 'combustivel': 'flex_mix',  'consumo_km': 0.090, 'consumo_idle': 0.65,  'unidade': 'L'},
    'carro_eletrico':  {'label': 'Carro (elétrico)',  'combustivel': 'grid_br',   'consumo_km': 0.180, 'consumo_idle': 0.15,  'unidade': 'kWh'},
    'moto':            {'label': 'Moto',              'combustivel': 'gasolina',  'consumo_km': 0.038, 'consumo_idle': 0.28,  'unidade': 'L'},
    'caminhao':        {'label': 'Caminhão',          'combustivel': 'diesel',    'consumo_km': 0.300, 'consumo_idle': 2.40,  'unidade': 'L'},
}

CONTEXTOS_CALC = {
    'pedagio':           {'label': 'Pedágio',           'tempo_fila_sem': 3.0,  'tempo_fila_com': 0.05, 'dist_extra_sem': 0.100, 'dist_extra_com': 0.031, 'papel_sem_g': 5.0, 'papel_com_g': 0.0},
    'estacionamento':    {'label': 'Estacionamento',    'tempo_fila_sem': 1.5,  'tempo_fila_com': 0.05, 'dist_extra_sem': 0.050, 'dist_extra_com': 0.010, 'papel_sem_g': 8.0, 'papel_com_g': 0.0},
    'acesso_controlado': {'label': 'Acesso Controlado', 'tempo_fila_sem': 1.0,  'tempo_fila_com': 0.05, 'dist_extra_sem': 0.030, 'dist_extra_com': 0.010, 'papel_sem_g': 4.0, 'papel_com_g': 0.0},
}

from django.views.decorators.http import require_GET as _rg

@_rg
def fatores_emissao(request):
    return JsonResponse({
        'meta': {'versao': '1.0', 'base_emissao': 'GHG Protocol Brasil 2023'},
        'fatores_emissao': FATORES_EMISSAO,
        'veiculos': VEICULOS_CALC,
        'contextos': CONTEXTOS_CALC,
    })


# =============================================================================
# DASHBOARD ESG CORPORATIVO (dados simulados)
# =============================================================================

_MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

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
    co2e_an  = DE.ANNUAL_TOTALS_KG.get(ano_ant, co2e_at)
    pass_an  = DE.ANNUAL_PASSAGENS.get(ano_ant, pass_at)
    est_an   = DE.ESTADOS_ATIVOS_POR_ANO.get(ano_ant, est_n)
    rank_an  = DE.RANKING_NACIONAL.get(ano_ant, {}).get('posicao', rank_inf.get('posicao', 0))
    def trend_pct(atual, ant): return round((atual - ant) / ant * 100, 1) if ant else 0
    return {
        'co2e_evitado':    {'valor_kg': co2e_at, 'valor_ton': round(co2e_at / 1000, 2), 'trend_pct': trend_pct(co2e_at, co2e_an), 'trend_dir': 'up' if co2e_at >= co2e_an else 'down'},
        'passagens':       {'valor': pass_at, 'trend_pct': trend_pct(pass_at, pass_an), 'trend_dir': 'up' if pass_at >= pass_an else 'down'},
        'estados_ativos':  {'valor': est_n, 'trend_abs': est_n - est_an, 'trend_dir': 'up' if est_n >= est_an else 'down'},
        'ranking_nacional':{'posicao': rank_inf.get('posicao'), 'grupo': rank_inf.get('grupo'), 'trend_abs': rank_an - rank_inf.get('posicao', rank_an), 'trend_dir': 'up' if rank_an >= rank_inf.get('posicao', rank_an) else 'down'},
    }

def _meta_vs_realizado(ano):
    meta   = DE.METAS_ANUAIS_KG.get(ano, 0)
    realiz = DE.ANNUAL_TOTALS_KG.get(ano, 0)
    return {'meta_kg': meta, 'realizado_kg': realiz, 'pct_atingido': round(realiz / meta * 100, 1) if meta else 0, 'status': 'atingida' if realiz >= meta else 'em_progresso'}


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
        raw = request.GET.get(param, '')
        parsed = [x.strip() for x in raw.split(',') if x.strip() in validos]
        return parsed if parsed else None

    ctx_f  = parse_lista('contexto', DE.CONTEXT_WEIGHTS)
    vei_f  = parse_lista('veiculo',  DE.VEHICLE_WEIGHTS)
    est_f  = parse_lista('estado',   {k.upper(): v for k, v in DE.STATE_WEIGHTS.items()})
    mensal = _co2e_mensal(ano, ctx_f, vei_f, est_f)
    anual  = _co2e_anual(ctx_f, vei_f, est_f)

    return JsonResponse({
        'empresa':               DE.EMPRESA_PERFIL,
        'filtros_opcoes':        DE.FILTROS_OPCOES,
        'filtros_ativos':        {'ano': ano, 'contextos': ctx_f or list(DE.CONTEXT_WEIGHTS), 'veiculos': vei_f or list(DE.VEHICLE_WEIGHTS), 'estados': est_f or list(DE.STATE_WEIGHTS)},
        'kpis':                  _kpis(ano, ctx_f, vei_f, est_f),
        'evolucao_mensal':       {'labels': _MESES_LABEL, 'ano': ano, 'series_kg': mensal, 'total_kg': sum(mensal)},
        'evolucao_anual':        {'labels': list(anual.keys()), 'series_kg': list(anual.values()), 'series_ton': [round(v / 1000, 2) for v in anual.values()], 'metas_kg': [DE.METAS_ANUAIS_KG.get(a, 0) for a in anual]},
        'distribuicao_contexto': _distribuicao_contexto(ano, vei_f, est_f),
        'distribuicao_veiculo':  _distribuicao_veiculo(ano, ctx_f, est_f),
        'ranking_estados':       _ranking_estados(ano, ctx_f, top_n),
        'meta_vs_realizado':     _meta_vs_realizado(ano),
        'equivalencias':         DE.EQUIVALENCIAS_2025 if ano == 2025 else {'arvores_ano': round(DE.ANNUAL_TOTALS_KG.get(ano, 0) / 21.77), 'litros_gasolina': round(DE.ANNUAL_TOTALS_KG.get(ano, 0) / 2.212), 'papel_kg_total': round(DE.ANNUAL_PASSAGENS.get(ano, 0) * 0.00455), 'tempo_fila_horas': round(DE.ANNUAL_PASSAGENS.get(ano, 0) * 3 / 60 * 0.62)},
        'ranking_mensal':        {'labels': _MESES_LABEL, 'series': DE.RANKING_MENSAL_2025 if ano == 2025 else []},
    })