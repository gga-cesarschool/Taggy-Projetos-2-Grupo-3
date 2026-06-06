import json
from datetime import date as date_cls

from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST

from .models import Veiculo, VeiculoEmpresa, Passagem

# Labels estáticas (antes em dados_empresas.py — não são dados simulados)
_CONTEXT_LABELS = {
    'pedagio':           'Pedágio',
    'estacionamento':    'Estacionamento',
    'acesso_controlado': 'Acesso Controlado',
}
_VEHICLE_LABELS = {
    'carro_combustao': 'Carro (combustão)',
    'carro_eletrico':  'Carro (elétrico)',
    'moto':            'Moto',
    'caminhao':        'Caminhão',
}


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
        'ano_atual':    date_cls.today().year,
    })

def calcular_conquistas(total_passagens, total_co2e):
    return [
        {
            "titulo": "Primeira Passagem",
            "icone": "",
            "ativa": total_passagens >= 1,
            "descricao": f"{total_passagens}/1 passagem"
        },
        {
            "titulo": "100 Passagens",
            "icone": "",
            "ativa": total_passagens >= 100,
            "descricao": f"{total_passagens}/100 passagens"
        },
        {
            "titulo": "Eco Warrior",
            "icone": "",
            "ativa": total_co2e >= 10,
            "descricao": f"{total_co2e:.2f}/10 kg CO₂e"
        },
        {
            "titulo": "500 Passagens",
            "icone": "",
            "ativa": total_passagens >= 500,
            "descricao": f"{total_passagens}/500 passagens"
        },
        {
            "titulo": "1 Tonelada Evitada",
            "icone": "",
            "ativa": total_co2e >= 1000,
            "descricao": f"{total_co2e:.2f}/1000 kg CO₂e"
        },
    ]






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
    """KPIs e dados dos graficos calculados a partir das passagens reais."""
    err = _auth_required(request)
    if err:
        return err

    hoje          = date_cls.today()
    ano_atual     = hoje.year

    todas = list(
        Passagem.objects.filter(usuario=request.user)
        .select_related('veiculo')
        .order_by('data')
    )

    # Usa o mes mais recente com passagens (nao necessariamente o mes atual)
    # Assim, se o usuario registrou passagens no mes passado, elas aparecem
    if todas:
        ultimo_mes   = todas[-1].data.month
        ultimo_ano   = todas[-1].data.year
        do_mes = [p for p in todas if p.data.month == ultimo_mes and p.data.year == ultimo_ano]
        mes_label = ultima_data = todas[-1].data
    else:
        do_mes = []

    co2e_mes = sum(p.co2e_total for p in do_mes)
    qtd_mes  = sum(p.quantidade for p in do_mes)
    tempo_mes = sum(
        p.quantidade * (CALC_CONTEXTOS[p.contexto]['tempo_sem'] - CALC_CONTEXTOS[p.contexto]['tempo_com'])
        for p in do_mes
        if p.contexto in CALC_CONTEXTOS
    )

    # Variacao em relacao ao mes anterior
    if todas and do_mes:
        mes_ant_num = ultimo_mes - 1 if ultimo_mes > 1 else 12
        ano_ant     = ultimo_ano if ultimo_mes > 1 else ultimo_ano - 1
        do_mes_ant  = [p for p in todas if p.data.month == mes_ant_num and p.data.year == ano_ant]
        co2e_ant    = sum(p.co2e_total for p in do_mes_ant)
        qtd_ant     = sum(p.quantidade for p in do_mes_ant)
        if co2e_ant > 0:
            trend_co2e_pct = round((co2e_mes - co2e_ant) / co2e_ant * 100, 1)
        else:
            trend_co2e_pct = None
        trend_qtd_abs = qtd_mes - qtd_ant
    else:
        trend_co2e_pct = None
        trend_qtd_abs  = 0

    #  Total acumulado
    co2e_total = sum(p.co2e_total for p in todas)

    #  Gráfico mensal (ano atual)
    mensal = [0.0] * 12
    for p in todas:
        if p.data.year == ano_atual:
            mensal[p.data.month - 1] = round(mensal[p.data.month - 1] + p.co2e_total, 4)

    #  Gráfico anual
    anual_dict: dict[int, float] = {}
    for p in todas:
        anual_dict[p.data.year] = round(anual_dict.get(p.data.year, 0) + p.co2e_total, 4)
    anos  = sorted(anual_dict) or [ano_atual]
    vals  = [anual_dict[a] for a in anos]

    #  Últimas passagens (histórico recente)
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

    total_passagens_all = sum(p.quantidade for p in todas)

    MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    mes_kpi_label = MESES_PT[do_mes[0].data.month - 1] if do_mes else MESES_PT[hoje.month - 1]

    nivel = _calcular_nivel(co2e_total)

    return JsonResponse({
        'ok': True,
        'nome': request.user.first_name or request.user.email.split('@')[0],
        'kpis': {
            'co2e_mes':        round(co2e_mes, 3),
            'qtd_mes':         qtd_mes,
            'co2e_total':      round(co2e_total, 3),
            'tempo_mes':       round(tempo_mes, 1),
            'mes_label':       mes_kpi_label,
            'trend_co2e_pct':  trend_co2e_pct,
            'trend_qtd_abs':   trend_qtd_abs,
        },
        'grafico_mensal': {'labels': MESES_LABEL, 'data': mensal},
        'grafico_anual':  {'labels': [str(a) for a in anos], 'data': vals},
        'recentes':       recentes,
        'conquistas':     calcular_conquistas(total_passagens_all, co2e_total),
        'nivel':          nivel,
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
# FROTA DA EMPRESA — listar veiculos vinculados
# =============================================================================

@require_GET
def api_empresa_frota(request):
    """Retorna veiculos vinculados a esta empresa (VeiculoEmpresa)."""
    err = _auth_required(request)
    if err:
        return err
    if _get_tipo(request.user) != 'empresa':
        return JsonResponse({'ok': False, 'erro': 'Apenas empresas.'}, status=403)

    veiculos_empresa = (
        VeiculoEmpresa.objects
        .filter(empresa=request.user)
        .select_related('veiculo__usuario')
    )
    data = []
    for ve in veiculos_empresa:
        v = ve.veiculo
        data.append({
            'id':         v.id,
            'nome':       v.nome,
            'tipo':       v.tipo,
            'tipo_label': v.get_tipo_display(),
            'placa':      v.placa,
            'proprietario': v.usuario.first_name or v.usuario.email.split('@')[0],
        })
    return JsonResponse({'ok': True, 'veiculos': data})


@require_POST
def api_empresa_registrar_passagem(request):
    """
    Empresa registra passagem em nome de um veiculo da sua frota.
    O veiculo deve estar vinculado a esta empresa via VeiculoEmpresa.
    """
    err = _auth_required(request)
    if err:
        return err
    if _get_tipo(request.user) != 'empresa':
        return JsonResponse({'ok': False, 'erro': 'Apenas empresas.'}, status=403)

    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'ok': False, 'erro': 'JSON invalido.'}, status=400)

    veiculo_id = body.get('veiculo_id')
    contexto   = body.get('contexto', '')
    data_str   = body.get('data', '')
    quantidade = body.get('quantidade', 1)

    if not veiculo_id:
        return JsonResponse({'ok': False, 'erro': 'Selecione um veiculo.'})
    if contexto not in CALC_CONTEXTOS:
        return JsonResponse({'ok': False, 'erro': 'Contexto invalido.'})
    try:
        quantidade = int(quantidade)
        assert 1 <= quantidade <= 9999
    except Exception:
        return JsonResponse({'ok': False, 'erro': 'Quantidade deve ser entre 1 e 9999.'})

    # Verifica que o veiculo pertence a frota desta empresa
    try:
        ve = VeiculoEmpresa.objects.select_related('veiculo').get(
            empresa=request.user, veiculo_id=int(veiculo_id)
        )
        veiculo = ve.veiculo
    except VeiculoEmpresa.DoesNotExist:
        return JsonResponse({'ok': False, 'erro': 'Veiculo nao encontrado na sua frota.'}, status=404)

    try:
        data = date_cls.fromisoformat(data_str) if data_str else date_cls.today()
    except ValueError:
        data = date_cls.today()

    co2e = calcular_co2e_passagem(veiculo.tipo, contexto)

    passagem = Passagem.objects.create(
        usuario          = veiculo.usuario,
        veiculo          = veiculo,
        empresa          = request.user,
        contexto         = contexto,
        data             = data,
        quantidade       = quantidade,
        co2e_por_passagem = co2e,
    )

    return JsonResponse({
        'ok':         True,
        'id':         passagem.id,
        'co2e_total': round(passagem.co2e_total, 4),
        'mensagem':   f'{quantidade} passagem(ns) registrada(s) para {veiculo.nome}. +{round(passagem.co2e_total * 1000, 1)} g CO2e evitados.',
    })


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


@require_GET
def api_empresas_dados(request):
    """Painel ESG Corporativo — exclusivamente dados reais do banco."""
    import datetime as _dt

    # Empresa logada
    user = request.user if request.user.is_authenticated else None
    try:
        perfil       = user.perfil
        nome_empresa = perfil.nome_empresa or (user.first_name or user.email.split('@')[0])
        cnpj         = perfil.cnpj or ''
    except Exception:
        nome_empresa = user.first_name or user.email.split('@')[0] if user else 'Empresa'
        cnpj         = ''

    ano_atual = _dt.date.today().year

    # Passagens onde esta empresa e a empresa vinculada
    passagens_todas = list(
        Passagem.objects.filter(empresa=user)
        .select_related('veiculo')
        .order_by('data')
    ) if user else []

    # Anos disponiveis
    anos_com_dados = sorted({p.data.year for p in passagens_todas}) or [ano_atual]

    try:
        ano = int(request.GET.get('ano', anos_com_dados[-1]))
        if ano not in anos_com_dados:
            ano = anos_com_dados[-1]
    except (ValueError, IndexError):
        ano = ano_atual

    try:
        top_n = max(1, min(int(request.GET.get('top_n', 8)), 22))
    except ValueError:
        top_n = 8

    passagens_ano = [p for p in passagens_todas if p.data.year == ano]

    #  Sem dados reais: zeros honestos, sem fallback simulado
    if not passagens_todas:
        MESES_LABEL_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
        zeros = [0.0] * 12
        return JsonResponse({
            'empresa':               {'nome': nome_empresa, 'cnpj': cnpj, 'setor': '', 'frota_total': 0, 'contrato_desde': '', 'plano': '', 'contato': user.email if user else '', 'is_demo': False},
            'filtros_opcoes':        {'anos': [ano_atual], 'contextos': [{'valor': k, 'label': v} for k, v in _CONTEXT_LABELS.items()], 'veiculos': [{'valor': k, 'label': v} for k, v in _VEHICLE_LABELS.items()], 'estados': []},
            'filtros_ativos':        {'ano': ano_atual, 'contextos': list(_CONTEXT_LABELS.keys()), 'veiculos': list(_VEHICLE_LABELS.keys()), 'estados': []},
            'kpis': {
                'co2e_evitado': {'valor_kg': 0, 'valor_ton': 0, 'trend_pct': 0, 'trend_dir': 'up'},
                'passagens':    {'valor': 0, 'trend_pct': 0, 'trend_dir': 'up'},
                'estados_ativos':   {'valor': 0, 'trend_abs': 0, 'trend_dir': 'up'},
                'ranking_nacional': {'posicao': None, 'grupo': '', 'trend_abs': 0, 'trend_dir': 'up'},
            },
            'evolucao_mensal':       {'labels': MESES_LABEL_PT, 'ano': ano_atual, 'series_kg': zeros, 'total_kg': 0},
            'evolucao_anual':        {'labels': [str(ano_atual)], 'series_kg': [0], 'series_ton': [0], 'metas_kg': [0]},
            'distribuicao_contexto': {k: {'label': v, 'co2e_kg': 0, 'passagens': 0, 'pct': 0} for k, v in _CONTEXT_LABELS.items()},
            'distribuicao_veiculo':  {k: {'label': v, 'co2e_kg': 0, 'pct': 0} for k, v in _VEHICLE_LABELS.items()},
            'ranking_estados':       [],
            'meta_vs_realizado':     {'meta_kg': 0, 'realizado_kg': 0, 'pct_atingido': 0, 'status': 'sem_dados'},
            'equivalencias':         {'arvores_ano': 0, 'litros_gasolina': 0, 'papel_kg_total': 0, 'tempo_fila_horas': 0},
            'ranking_mensal':        {'labels': MESES_LABEL_PT, 'series': []},
        })

    #  Com dados reais
    MESES_LABEL_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

    # KPIs do ano selecionado
    co2e_ano   = sum(p.co2e_total for p in passagens_ano)
    pass_ano   = sum(p.quantidade for p in passagens_ano)

    # KPIs do ano anterior (para trend)
    ano_ant       = ano - 1
    passagens_ant = [p for p in passagens_todas if p.data.year == ano_ant]
    co2e_ant      = sum(p.co2e_total for p in passagens_ant)
    pass_ant      = sum(p.quantidade for p in passagens_ant)

    def trend_pct(atual, ant):
        return round((atual - ant) / ant * 100, 1) if ant else 0

    # Evolucao mensal do ano selecionado
    mensal_real = [0.0] * 12
    for p in passagens_ano:
        mensal_real[p.data.month - 1] = round(mensal_real[p.data.month - 1] + p.co2e_total, 3)

    # Evolucao anual
    anual_real = {}
    for p in passagens_todas:
        anual_real[p.data.year] = round(anual_real.get(p.data.year, 0) + p.co2e_total, 3)
    anos_ord = sorted(anual_real)

    # Distribuicao por contexto (real)
    ctx_totais = {}
    ctx_pass   = {}
    for p in passagens_ano:
        ctx_totais[p.contexto] = round(ctx_totais.get(p.contexto, 0) + p.co2e_total, 3)
        ctx_pass[p.contexto]   = ctx_pass.get(p.contexto, 0) + p.quantidade
    total_ctx = sum(ctx_totais.values()) or 1
    dist_ctx  = {
        ctx: {
            'label':     CALC_CONTEXTOS.get(ctx, {}).get('tempo_sem', ctx) and _CONTEXT_LABELS.get(ctx, ctx),
            'co2e_kg':   round(v, 3),
            'passagens': ctx_pass.get(ctx, 0),
            'pct':       round(v / total_ctx * 100),
        }
        for ctx, v in ctx_totais.items()
    }
    # Garante todos os contextos
    for ctx, lbl in _CONTEXT_LABELS.items():
        if ctx not in dist_ctx:
            dist_ctx[ctx] = {'label': lbl, 'co2e_kg': 0, 'passagens': 0, 'pct': 0}

    # Distribuicao por veiculo (real)
    vei_totais = {}
    for p in passagens_ano:
        t = p.veiculo.tipo
        vei_totais[t] = round(vei_totais.get(t, 0) + p.co2e_total, 3)
    total_vei = sum(vei_totais.values()) or 1
    dist_vei  = {
        vk: {
            'label':   _VEHICLE_LABELS.get(vk, vk),
            'co2e_kg': round(vei_totais.get(vk, 0), 3),
            'pct':     round(vei_totais.get(vk, 0) / total_vei * 100) if vk in vei_totais else 0,
        }
        for vk in _VEHICLE_LABELS
    }

    # Equivalencias
    equiv = {
        'arvores_ano':      round(co2e_ano / 21.77) if co2e_ano else 0,
        'litros_gasolina':  round(co2e_ano / 2.212) if co2e_ano else 0,
        'papel_kg_total':   round(sum(
            p.quantidade * CALC_CONTEXTOS.get(p.contexto, {}).get('papel_sem', 0) / 1000
            for p in passagens_ano
        ), 2),
        'tempo_fila_horas': round(sum(
            p.quantidade * (CALC_CONTEXTOS.get(p.contexto, {}).get('tempo_sem', 0) - CALC_CONTEXTOS.get(p.contexto, {}).get('tempo_com', 0)) / 60
            for p in passagens_ano
        ), 1),
    }

    # Frota ativa (veiculos distintos com passagens no ano)
    frota_ativa = len({p.veiculo_id for p in passagens_ano})

    empresa_perfil = {
        'nome':           nome_empresa,
        'cnpj':           cnpj,
        'setor':          getattr(perfil, 'tipo_servico', '') or 'Empresa',
        'frota_total':    frota_ativa,
        'contrato_desde': '',
        'plano':          '',
        'contato':        user.email if user else '',
        'is_demo':        False,
    }

    filtros_opcoes = {
        'anos':      anos_com_dados,
        'contextos': [{'valor': k, 'label': v} for k, v in _CONTEXT_LABELS.items()],
        'veiculos':  [{'valor': k, 'label': v} for k, v in _VEHICLE_LABELS.items()],
        'estados':   [],
    }

    return JsonResponse({
        'empresa':               empresa_perfil,
        'filtros_opcoes':        filtros_opcoes,
        'filtros_ativos':        {'ano': ano, 'contextos': list(dist_ctx.keys()), 'veiculos': list(dist_vei.keys()), 'estados': []},
        'kpis': {
            'co2e_evitado': {
                'valor_kg':  round(co2e_ano, 3),
                'valor_ton': round(co2e_ano / 1000, 3),
                'trend_pct': trend_pct(co2e_ano, co2e_ant),
                'trend_dir': 'up' if co2e_ano >= co2e_ant else 'down',
            },
            'passagens': {
                'valor':     pass_ano,
                'trend_pct': trend_pct(pass_ano, pass_ant),
                'trend_dir': 'up' if pass_ano >= pass_ant else 'down',
            },
            'estados_ativos':   {'valor': 1, 'trend_abs': 0, 'trend_dir': 'up'},
            'ranking_nacional': {'posicao': None, 'grupo': '', 'trend_abs': 0, 'trend_dir': 'up'},
        },
        'evolucao_mensal':       {'labels': MESES_LABEL_PT, 'ano': ano, 'series_kg': mensal_real, 'total_kg': sum(mensal_real)},
        'evolucao_anual':        {'labels': [str(a) for a in anos_ord], 'series_kg': [anual_real[a] for a in anos_ord], 'series_ton': [round(anual_real[a]/1000, 3) for a in anos_ord], 'metas_kg': [0]*len(anos_ord)},
        'distribuicao_contexto': dist_ctx,
        'distribuicao_veiculo':  dist_vei,
        'ranking_estados':       [],
        'meta_vs_realizado':     {'meta_kg': 0, 'realizado_kg': round(co2e_ano, 3), 'pct_atingido': 0, 'status': 'em_progresso'},
        'equivalencias':         equiv,
        'ranking_mensal':        {'labels': MESES_LABEL_PT, 'series': []},
    })

# =============================================================================
# Taggy Seeds — Retrospectiva Anual (US2)
# =============================================================================

from django.contrib.auth.decorators import login_required

_MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

# MOCK_SEEDS removido — sem dados fictícios


def _calcular_nivel(co2e_kg):
    if co2e_kg < 50:
        return {'nome': 'Iniciante', 'pontos': int(co2e_kg * 2), 'pontos_para_proximo': int((50 - co2e_kg) * 2),
                'medalhas': [{'icone': 'bolt', 'ativo': True}, {'icone': 'star', 'ativo': False}, {'icone': 'forest', 'ativo': False}, {'icone': 'military_tech', 'ativo': False}]}
    elif co2e_kg < 150:
        pts = int(co2e_kg * 2)
        return {'nome': 'Intermediário', 'pontos': pts, 'pontos_para_proximo': int((150 - co2e_kg) * 2),
                'medalhas': [{'icone': 'bolt', 'ativo': True}, {'icone': 'star', 'ativo': True}, {'icone': 'forest', 'ativo': False}, {'icone': 'military_tech', 'ativo': False}]}
    elif co2e_kg < 500:
        pts = int(co2e_kg * 2)
        return {'nome': 'Avançado', 'pontos': pts, 'pontos_para_proximo': int((500 - co2e_kg) * 2),
                'medalhas': [{'icone': 'bolt', 'ativo': True}, {'icone': 'star', 'ativo': True}, {'icone': 'forest', 'ativo': True}, {'icone': 'military_tech', 'ativo': False}]}
    else:
        pts = int(co2e_kg * 2)
        return {'nome': 'Eco Master', 'pontos': pts, 'pontos_para_proximo': 0,
                'medalhas': [{'icone': 'bolt', 'ativo': True}, {'icone': 'star', 'ativo': True}, {'icone': 'forest', 'ativo': True}, {'icone': 'military_tech', 'ativo': True}]}


@login_required
def taggy_seeds(request):
    tipo = _get_tipo(request.user)
    nome = request.user.first_name or request.user.email.split('@')[0]
    return render(request, 'taggy_seeds.html', {
        'nome_usuario': nome,
        'tipo_usuario': tipo,
    })


@login_required
@require_GET
def api_taggy_seeds(request):
    """
    Retrospectiva anual real do usuário logado.
    Usa exclusivamente dados do modelo Passagem — sem fallback mockado.
    Retorna zeros quando o usuário não tem passagens (exibe estado vazio honesto).
    """
    import datetime
    user = request.user
    ano  = datetime.date.today().year
    nome = user.first_name or user.email.split('@')[0]

    # Todas as passagens do ano atual
    # Empresa: passagens onde empresa=user (registradas pela empresa)
    # Pessoa:  passagens onde usuario=user
    tipo = _get_tipo(user)
    if tipo == 'empresa':
        passagens_qs = list(
            Passagem.objects
            .filter(empresa=user, data__year=ano)
            .select_related('veiculo')
        )
        # Se nao houver passagens como empresa, tenta como usuario normal
        if not passagens_qs:
            passagens_qs = list(
                Passagem.objects
                .filter(usuario=user, data__year=ano)
                .select_related('veiculo')
            )
    else:
        passagens_qs = list(
            Passagem.objects
            .filter(usuario=user, data__year=ano)
            .select_related('veiculo')
        )

    #  Acumuladores
    total_passagens = 0
    total_co2e      = 0.0   # kg
    total_tempo_min = 0.0   # minutos poupados
    total_papeis    = 0.0   # folhas evitadas
    co2e_por_mes    = [0.0] * 12

    for p in passagens_qs:
        qtd  = p.quantidade
        co2e = float(p.co2e_por_passagem) * qtd
        total_passagens += qtd
        total_co2e      += co2e

        co2e_por_mes[p.data.month - 1] += co2e

        ctx = CALC_CONTEXTOS.get(p.contexto, {})
        # minutos poupados por não ficar na fila
        total_tempo_min += (ctx.get('tempo_sem', 0) - ctx.get('tempo_com', 0)) * qtd
        # papéis evitados (tickets físicos por passagem)
        total_papeis    += ctx.get('papel_sem', 0) * qtd

    #  Equivalências ambientais
    # 1 árvore absorve ~21,77 kg CO2/ano  (fonte: metodologia TagGreen)
    arvores     = round(total_co2e / 21.77, 1) if total_co2e else 0
    # 1 litro de gasolina emite ~2,212 kg CO2e
    combustivel = round(total_co2e / 2.212, 1) if total_co2e else 0
    tempo_horas = round(total_tempo_min / 60, 2)
    papeis      = round(total_papeis, 1)

    #  Comparativo dos dois últimos meses com passagens
    meses_com_dados = [(i, round(v, 3)) for i, v in enumerate(co2e_por_mes) if v > 0]

    if len(meses_com_dados) >= 2:
        mes_ant_idx, mes_ant_co2e = meses_com_dados[-2]
        mes_at_idx,  mes_at_co2e  = meses_com_dados[-1]
        if mes_at_co2e < mes_ant_co2e:
            mensagem = 'Você reduziu ainda mais! '
        elif mes_at_co2e == mes_ant_co2e:
            mensagem = 'Consistência é o que importa!'
        else:
            mensagem = 'Você está crescendo! Continue assim!'
        comparativo = {
            'mes_anterior_label': _MESES_ABREV[mes_ant_idx],
            'mes_atual_label':    _MESES_ABREV[mes_at_idx],
            'mes_anterior_co2e':  mes_ant_co2e,
            'mes_atual_co2e':     mes_at_co2e,
            'mensagem':           mensagem,
        }
    elif len(meses_com_dados) == 1:
        idx, val = meses_com_dados[0]
        comparativo = {
            'mes_anterior_label': _MESES_ABREV[idx],
            'mes_atual_label':    _MESES_ABREV[idx],
            'mes_anterior_co2e':  val,
            'mes_atual_co2e':     val,
            'mensagem':           'Seu primeiro mês registrado! ',
        }
    else:
        # Sem passagens ainda
        mes_atual = datetime.date.today().month - 1
        comparativo = {
            'mes_anterior_label': _MESES_ABREV[mes_atual - 1] if mes_atual > 0 else _MESES_ABREV[11],
            'mes_atual_label':    _MESES_ABREV[mes_atual],
            'mes_anterior_co2e':  0,
            'mes_atual_co2e':     0,
            'mensagem':           'Registre passagens para ver seu comparativo!',
        }

    #  Nível e medalhas
    nivel = _calcular_nivel(total_co2e)

    return JsonResponse({
        'usuario': {'nome': nome},
        'ano':     ano,
        'total': {
            'co2e_kg':           round(total_co2e, 3),
            'passagens':         total_passagens,
            'combustivel_litros': combustivel,
            'tempo_horas':       tempo_horas,
            'papeis_evitados':   papeis,
            'arvores':           arvores,
        },
        'comparativo_mensal': comparativo,
        'nivel': nivel,
    })


# =============================================================================
# RANKING DE USUÁRIOS — dados reais
# =============================================================================

def _periodo_inicio(periodo: str):
    """Retorna (data_inicio, label) para o período solicitado."""
    hoje = date_cls.today()
    if periodo == 'este_mes':
        return hoje.replace(day=1), 'Este mês'
    if periodo == 'ultimos_3_meses':
        mes = hoje.month - 2
        ano = hoje.year
        while mes <= 0:
            mes += 12
            ano -= 1
        return hoje.replace(year=ano, month=mes, day=1), 'Últimos 3 meses'
    # este_ano (default)
    return hoje.replace(month=1, day=1), 'Este ano'


def _badge(co2e_kg: float) -> dict:
    if co2e_kg >= 200:
        return {'label': 'Impacto alto', 'cls': 'high'}
    if co2e_kg >= 50:
        return {'label': 'Eco+',         'cls': 'eco'}
    if co2e_kg >= 1:
        return {'label': 'Iniciante',    'cls': 'basic'}
    return {'label': '', 'cls': ''}


def _iniciais(user) -> str:
    fn = (user.first_name or '').strip()
    ln = (user.last_name  or '').strip()
    if fn and ln: return (fn[0] + ln[0]).upper()
    if fn:        return fn[:2].upper()
    return user.email[0].upper()

def _nivel_label(co2e: float) -> str:
    if co2e >= 500: return 'Eco Master'
    if co2e >= 150: return 'Avançado'
    if co2e >= 50:  return 'Intermediário'
    return 'Iniciante'

def _badge_label(co2e: float) -> str:
    if co2e >= 200: return 'Impacto alto'
    if co2e >= 50:  return 'Eco+'
    return 'Iniciante'

_PERIODO_MAP = {
    'mes': 'este_mes', 'trimestre': 'ultimos_3_meses', 'ano': 'este_ano',
    'este_mes': 'este_mes', 'ultimos_3_meses': 'ultimos_3_meses', 'este_ano': 'este_ano',
}


@require_GET
def api_ranking(request):
    """Ranking por CO₂e. Período: mes|trimestre|ano. Resposta compatível com o HTML."""
    err = _auth_required(request)
    if err: return err

    periodo_key = _PERIODO_MAP.get(request.GET.get('periodo', 'mes'), 'este_mes')
    data_inicio, _ = _periodo_inicio(periodo_key)

    passagens = (
        Passagem.objects
        .filter(data__gte=data_inicio)
        .exclude(usuario__perfil__tipo='empresa')   # exclui empresas; inclui sem Perfil
        .select_related('veiculo', 'usuario')
    )

    user_map: dict = {}
    for p in passagens:
        uid = p.usuario_id
        if uid not in user_map:
            user_map[uid] = {'usuario': p.usuario, 'co2e': 0.0, 'tempo_min': 0.0, 'passagens': 0}
        user_map[uid]['co2e']      += p.co2e_total
        user_map[uid]['passagens'] += p.quantidade
        ctx = CALC_CONTEXTOS.get(p.contexto, {})
        user_map[uid]['tempo_min'] += p.quantidade * (ctx.get('tempo_sem', 0) - ctx.get('tempo_com', 0))

    ranking  = sorted(user_map.values(), key=lambda x: x['co2e'], reverse=True)
    max_co2e = ranking[0]['co2e'] if ranking else 1
    eu_uid   = request.user.id
    eu       = user_map.get(eu_uid)
    minha_pos = next((i + 1 for i, r in enumerate(ranking) if r['usuario'].id == eu_uid), None)
    total     = len(ranking)

    meu_co2e  = round(eu['co2e'],      1) if eu else 0.0
    meu_tempo = round(eu['tempo_min'], 1) if eu else 0.0
    meus_pass = eu['passagens']            if eu else 0
    falta_kg  = round(ranking[minha_pos - 2]['co2e'] - meu_co2e, 1) if (minha_pos and minha_pos > 1) else None

    lista = []
    for i, item in enumerate(ranking[:50]):
        u    = item['usuario']
        nome = u.first_name or u.email.split('@')[0]
        if u.id != eu_uid and u.last_name:
            nome = f"{u.first_name} {u.last_name[0]}."
        lista.append({
            'posicao':    i + 1,
            'iniciais':   _iniciais(u),
            'nome':       nome,
            'co2e_total': round(item['co2e'], 1),
            'tempo_min':  round(item['tempo_min'], 1),
            'passagens':  item['passagens'],
            'e_voce':     u.id == eu_uid,
            'nivel':      _badge_label(item['co2e']),
            'barra_pct':  round(item['co2e'] / max_co2e * 100),
        })

    return JsonResponse({
        'ok': True,
        'usuario': {
            'iniciais':  _iniciais(request.user),
            'posicao':   minha_pos or (total + 1),
            'co2e':      meu_co2e,
            'nivel':     _nivel_label(meu_co2e),
            'total':     total,
            'tempo_min': meu_tempo,
            'passagens': meus_pass,
            'falta_kg':  falta_kg,
        },
        'ranking': lista,
    })


@require_GET
def api_ranking_empresas(request):
    """
    Ranking de empresas por CO₂e evitado pela frota.
    Formato compatível com empresas_relatorios.js.
    """
    err = _auth_required(request)
    if err:
        return err

    periodo = request.GET.get('periodo', 'este_ano')
    data_inicio, _ = _periodo_inicio(periodo)

    passagens = (
        Passagem.objects
        .filter(empresa__isnull=False, data__gte=data_inicio)
        .select_related('empresa__perfil')
    )

    emp_map: dict = {}
    for p in passagens:
        if p.empresa_id is None:
            continue
        eid = p.empresa_id
        if eid not in emp_map:
            emp_map[eid] = {'empresa': p.empresa, 'co2e': 0.0, 'passagens': 0}
        emp_map[eid]['co2e']      += p.co2e_total
        emp_map[eid]['passagens'] += p.quantidade

    ranking   = sorted(emp_map.values(), key=lambda x: x['co2e'], reverse=True)
    max_co2e  = ranking[0]['co2e'] if ranking else 1
    total     = len(ranking)
    eu_uid    = request.user.id

    def _nome_empresa(u):
        try:
            return u.perfil.nome_empresa or u.first_name or u.email.split('@')[0]
        except Exception:
            return u.first_name or u.email.split('@')[0]

    def _iniciais_emp(nome: str) -> str:
        words = nome.strip().split()
        if len(words) >= 2:
            return (words[0][0] + words[1][0]).upper()
        return nome[:2].upper()

    def _badge_emp(co2e_ton: float) -> str:
        if co2e_ton >= 10:  return 'Impacto alto'
        if co2e_ton >= 2:   return 'Eco+'
        return 'Iniciante'

    # Posição e dados da empresa logada
    eu_pos   = next((i + 1 for i, r in enumerate(ranking) if r['empresa'].id == eu_uid), None)
    eu_item  = emp_map.get(eu_uid)
    eu_co2e  = eu_item['co2e']      if eu_item else 0.0
    eu_pass  = eu_item['passagens'] if eu_item else 0
    eu_ton   = round(eu_co2e / 1000, 3)

    falta_ton = None
    if eu_pos and eu_pos > 1:
        acima_co2e = ranking[eu_pos - 2]['co2e']
        falta_ton  = round((acima_co2e - eu_co2e) / 1000, 3)

    try:
        eu_user   = request.user
        eu_nome   = _nome_empresa(eu_user)
        eu_inic   = _iniciais_emp(eu_nome)
    except Exception:
        eu_nome, eu_inic = '', 'EM'

    lista = []
    for i, item in enumerate(ranking[:50]):
        e    = item['empresa']
        nome = _nome_empresa(e)
        ton  = round(item['co2e'] / 1000, 3)
        lista.append({
            'posicao':   i + 1,
            'iniciais':  _iniciais_emp(nome),
            'nome':      nome,
            'co2e_ton':  ton,
            'passagens': item['passagens'],
            'e_voce':    e.id == eu_uid,
            'nivel':     _badge_emp(ton),
            'barra_pct': round(item['co2e'] / max_co2e * 100),
        })

    return JsonResponse({
        'ok': True,
        'empresa': {
            'iniciais':  eu_inic,
            'posicao':   eu_pos or (total + 1),
            'co2e_ton':  eu_ton,
            'nivel':     _badge_emp(eu_ton),
            'total':     total,
            'passagens': eu_pass,
            'falta_ton': falta_ton,
        },
        'ranking': lista,
    })

# =============================================================================
# HISTÓRICO DE ATIVIDADES
# =============================================================================

from django.contrib.auth.decorators import login_required as _login_req

# Tabela de níveis do histórico (CO₂e acumulado all-time em kg)
_NIVEIS_HIST = [
    {'n': 1, 'nome': 'Estreante',       'min': 0,   'max': 2   },
    {'n': 2, 'nome': 'Eco Iniciante',   'min': 2,   'max': 8   },
    {'n': 3, 'nome': 'Eco Consciente',  'min': 8,   'max': 20  },
    {'n': 4, 'nome': 'Motorista Eco',   'min': 20,  'max': 50  },
    {'n': 5, 'nome': 'Eco Champion',    'min': 50,  'max': 100 },
    {'n': 6, 'nome': 'Guardião Verde',  'min': 100, 'max': 200 },
    {'n': 7, 'nome': 'Eco Master',      'min': 200, 'max': 500 },
    {'n': 8, 'nome': 'Lenda Verde',     'min': 500, 'max': None},
]
_MESES_ABREV_HIST = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
_MESES_NOME_HIST  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                     'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']


def _calcular_nivel_historico(co2e_total: float) -> dict:
    for i, nv in enumerate(_NIVEIS_HIST):
        if nv['max'] is None or co2e_total < nv['max']:
            if nv['max'] is not None:
                span    = nv['max'] - nv['min']
                prog    = max(0, min(99, round((co2e_total - nv['min']) / span * 100))) if span else 0
                faltam  = round(max(0, nv['max'] - co2e_total), 1)
                proximo = _NIVEIS_HIST[i + 1] if i + 1 < len(_NIVEIS_HIST) else None
            else:
                prog, faltam, proximo = 100, 0.0, None
            return {
                'numero':         nv['n'],
                'nome':           nv['nome'],
                'progresso_pct':  prog,
                'faltam_kg':      faltam,
                'proximo_numero': proximo['n']    if proximo else None,
                'proximo_nome':   proximo['nome'] if proximo else None,
            }
    return {'numero': 1, 'nome': 'Estreante', 'progresso_pct': 0,
            'faltam_kg': 2.0, 'proximo_numero': 2, 'proximo_nome': 'Eco Iniciante'}


@_login_req
def historico(request):
    if _get_tipo(request.user) == 'empresa':
        return redirect('empresas_relatorios')
    return render(request, 'historico.html', {
        'nome_usuario': request.user.first_name or request.user.email.split('@')[0],
    })


@_login_req
@require_GET
def api_historico(request):
    """
    Dados do histórico de atividades (KPIs, nível, conquistas, lista de passagens).
    Parâmetros GET: periodo (mes|trimestre|ano|personalizado)
                    tipo (todos|pedagio|estacionamento|acesso_controlado)
                    busca (text)
                    data_inicio / data_fim (YYYY-MM-DD, para periodo=personalizado)
    """
    user = request.user
    hoje = date_cls.today()

    # ── Período ────────────────────────────────────────────────────────────
    periodo = request.GET.get('periodo', 'mes')
    if periodo == 'trimestre':
        mes = hoje.month - 2
        ano = hoje.year
        while mes <= 0:
            mes += 12
            ano -= 1
        data_ini = hoje.replace(year=ano, month=mes, day=1)
        data_fim = hoje
    elif periodo == 'ano':
        data_ini = hoje.replace(month=1, day=1)
        data_fim = hoje
    elif periodo == 'personalizado':
        try:   data_ini = date_cls.fromisoformat(request.GET.get('data_inicio', ''))
        except: data_ini = hoje.replace(day=1)
        try:   data_fim = date_cls.fromisoformat(request.GET.get('data_fim', ''))
        except: data_fim = hoje
    else:   # mes (default)
        data_ini = hoje.replace(day=1)
        data_fim = hoje

    # ── Query base ─────────────────────────────────────────────────────────
    tipo_filtro = request.GET.get('tipo', 'todos')
    busca       = request.GET.get('busca', '').strip()

    qs = (Passagem.objects
          .filter(usuario=user, data__gte=data_ini, data__lte=data_fim)
          .select_related('veiculo', 'empresa__perfil')
          .order_by('-data', '-criado_em'))

    if tipo_filtro in ('pedagio', 'estacionamento', 'acesso_controlado'):
        qs = qs.filter(contexto=tipo_filtro)

    if busca:
        qs = qs.filter(empresa__perfil__nome_empresa__icontains=busca)

    passagens_filtradas = list(qs[:200])

    # ── KPIs do período filtrado ────────────────────────────────────────────
    co2e_periodo = sum(p.co2e_total for p in passagens_filtradas)
    qtd_periodo  = sum(p.quantidade for p in passagens_filtradas)
    tempo_periodo = sum(
        p.quantidade * (CALC_CONTEXTOS.get(p.contexto, {}).get('tempo_sem', 0)
                       - CALC_CONTEXTOS.get(p.contexto, {}).get('tempo_com', 0))
        for p in passagens_filtradas
    )

    # ── Mês mais sustentável (all-time) ────────────────────────────────────
    todas = list(Passagem.objects.filter(usuario=user).only('data', 'co2e_por_passagem', 'quantidade'))
    mes_co2e: dict = {}
    for p in todas:
        k = (p.data.year, p.data.month)
        mes_co2e[k] = mes_co2e.get(k, 0) + p.co2e_total
    mes_sustentavel = None
    if mes_co2e:
        best = max(mes_co2e, key=lambda k: mes_co2e[k])
        mes_sustentavel = {
            'abrev': _MESES_ABREV_HIST[best[1] - 1].capitalize(),
            'nome':  _MESES_NOME_HIST[best[1] - 1],
            'co2e':  round(mes_co2e[best], 3),
        }

    # ── Nível e conquistas (all-time) ──────────────────────────────────────
    co2e_total_all  = sum(p.co2e_total for p in todas)
    qtd_total_all   = sum(p.quantidade for p in todas)
    nivel           = _calcular_nivel_historico(co2e_total_all)
    conquistas_raw  = calcular_conquistas(qtd_total_all, co2e_total_all)

    # ── Lista de atividades ────────────────────────────────────────────────
    atividades = []
    for p in passagens_filtradas:
        empresa_nome = ''
        try:
            if p.empresa:
                empresa_nome = p.empresa.perfil.nome_empresa
        except Exception:
            pass

        co2e_item = p.co2e_total
        co2e_g    = co2e_item * 1000
        badge     = 'Eco+' if co2e_g >= 100 else ('Iniciante' if co2e_g > 0 else '')
        data_fmt  = f"{p.data.day:02d} {_MESES_ABREV_HIST[p.data.month - 1]} {p.data.year}"

        atividades.append({
            'id':              p.id,
            'data':            p.data.isoformat(),
            'data_fmt':        data_fmt,
            'contexto':        p.contexto,
            'contexto_label':  p.get_contexto_display(),
            'veiculo_nome':    p.veiculo.nome,
            'veiculo_tipo':    p.veiculo.tipo,
            'veiculo_icon':    p.veiculo.icon,
            'empresa_nome':    empresa_nome,
            'quantidade':      p.quantidade,
            'co2e_total':      round(co2e_item, 4),
            'co2e_g':          round(co2e_g, 1),
            'badge':           badge,
        })

    return JsonResponse({
        'ok': True,
        'kpis': {
            'co2e_periodo':    round(co2e_periodo, 3),
            'qtd_periodo':     qtd_periodo,
            'tempo_min':       round(tempo_periodo, 1),
            'mes_sustentavel': mes_sustentavel,
        },
        'nivel':           nivel,
        'conquistas':      conquistas_raw,
        'atividades':      atividades,
        'total_registros': len(atividades),
    })