import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from .models import UserProfile, Vehicle, Passage, FAQ
from .forms import LoginForm, RegisterPessoaForm, RegisterEmpresaForm, VehicleForm
from .calculator import calcular_mensal, VEHICLE_PARAMS, CONTEXT_PARAMS


def home(request):
    result = None
    if request.method == 'POST':
        vehicle_type = request.POST.get('vehicle_type', 'combustao')
        context_type = request.POST.get('context_type', 'pedagio')
        passagens = int(request.POST.get('passagens', 10))
        result = calcular_mensal(vehicle_type, context_type, passagens)
    return render(request, 'core/home.html', {
        'result': result,
        'vehicle_params': VEHICLE_PARAMS,
        'context_params': CONTEXT_PARAMS,
    })


def calculadora(request):
    result = None
    vehicle_type = request.POST.get('vehicle_type', 'combustao')
    context_type = request.POST.get('context_type', 'pedagio')
    passagens = int(request.POST.get('passagens', 10))

    if request.method == 'POST':
        result = calcular_mensal(vehicle_type, context_type, passagens)

    return render(request, 'core/calculator.html', {
        'result': result,
        'vehicle_params': VEHICLE_PARAMS,
        'context_params': CONTEXT_PARAMS,
        'vehicle_type': vehicle_type,
        'context_type': context_type,
        'passagens': passagens,
    })


def calcular_api(request):
    """Endpoint AJAX para cálculo em tempo real."""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            vehicle_type = data.get('vehicle_type', 'combustao')
            context_type = data.get('context_type', 'pedagio')
            passagens = int(data.get('passagens', 10))

            if vehicle_type not in VEHICLE_PARAMS:
                return JsonResponse({'error': 'Tipo de veículo inválido'}, status=400)
            if context_type not in CONTEXT_PARAMS:
                return JsonResponse({'error': 'Tipo de contexto inválido'}, status=400)
            if not (1 <= passagens <= 200):
                return JsonResponse({'error': 'Passagens deve ser entre 1 e 200'}, status=400)

            result = calcular_mensal(vehicle_type, context_type, passagens)
            return JsonResponse(result)
        except (json.JSONDecodeError, ValueError) as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Método não permitido'}, status=405)


def login_view(request):
    if request.user.is_authenticated:
        return redirect('home')

    mode = request.GET.get('mode', 'login')
    account_type = request.GET.get('type', 'pessoa')

    login_form = LoginForm()
    register_form_pessoa = RegisterPessoaForm()
    register_form_empresa = RegisterEmpresaForm()

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'login':
            login_form = LoginForm(request, data=request.POST)
            if login_form.is_valid():
                user = login_form.get_user()
                login(request, user)
                messages.success(request, f'Bem-vindo, {user.first_name or user.username}!')
                return redirect(request.GET.get('next', 'home'))
            else:
                mode = 'login'

        elif action == 'register_pessoa':
            register_form_pessoa = RegisterPessoaForm(request.POST)
            if register_form_pessoa.is_valid():
                user = register_form_pessoa.save()
                login(request, user)
                messages.success(request, 'Conta criada com sucesso! Bem-vindo ao TagGreen!')
                return redirect('meu_impacto')
            else:
                mode = 'register'
                account_type = 'pessoa'

        elif action == 'register_empresa':
            register_form_empresa = RegisterEmpresaForm(request.POST)
            if register_form_empresa.is_valid():
                user = register_form_empresa.save()
                login(request, user)
                messages.success(request, 'Empresa cadastrada com sucesso!')
                return redirect('b2b')
            else:
                mode = 'register'
                account_type = 'empresa'

    return render(request, 'core/login.html', {
        'mode': mode,
        'account_type': account_type,
        'login_form': login_form,
        'register_form_pessoa': register_form_pessoa,
        'register_form_empresa': register_form_empresa,
    })


def logout_view(request):
    logout(request)
    messages.info(request, 'Você saiu da sua conta.')
    return redirect('home')


@login_required
def meu_impacto(request):
    user = request.user
    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        profile = UserProfile.objects.create(user=user)

    vehicles = user.vehicles.all()

    # Mock monthly data (in production, query from Passage model)
    monthly_data = [
        {'month': 'Jan', 'co2': 2.4},
        {'month': 'Fev', 'co2': 1.8},
        {'month': 'Mar', 'co2': 3.1},
        {'month': 'Abr', 'co2': 2.7},
        {'month': 'Mai', 'co2': 3.4},
        {'month': 'Jun', 'co2': 2.9},
        {'month': 'Jul', 'co2': 4.1},
        {'month': 'Ago', 'co2': 3.6},
        {'month': 'Set', 'co2': 3.8},
        {'month': 'Out', 'co2': 4.2},
        {'month': 'Nov', 'co2': 3.5},
        {'month': 'Dez', 'co2': 4.8},
    ]

    annual_data = [
        {'year': 2022, 'co2': 18.3},
        {'year': 2023, 'co2': 24.7},
        {'year': 2024, 'co2': 31.2},
        {'year': 2025, 'co2': 38.5},
    ]

    level_info = profile.get_level()
    total_co2 = sum(d['co2'] for d in monthly_data)

    return render(request, 'core/my_impact.html', {
        'profile': profile,
        'vehicles': vehicles,
        'monthly_data': json.dumps(monthly_data),
        'annual_data': json.dumps(annual_data),
        'monthly_list': monthly_data,
        'level_info': level_info,
        'total_co2': round(total_co2, 2),
        'total_passages': profile.total_passages or 127,
        'total_time_saved': profile.total_time_saved or 382,
        'trees_equivalent': round(total_co2 / (21.77 / 12), 1),
    })


@login_required
def wrapped(request):
    user = request.user
    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        profile = UserProfile.objects.create(user=user)

    wrapped_data = {
        'co2_total': 38.5,
        'passagens_total': 1524,
        'tempo_total': 4572,
        'arvores': round(38.5 / 21.77, 1),
        'combustivel': round(38.5 / 1.335 / 0.090, 1),
        'papel_folhas': 1524,
        'nivel': profile.get_level()['name'],
        'best_month': 'Dezembro',
        'best_month_co2': 4.8,
    }

    return render(request, 'core/wrapped.html', {'wrapped_data': wrapped_data, 'profile': profile})


@login_required
def b2b(request):
    # Mock corporate data
    monthly_data = [
        {'month': 'Jan', 'co2': 1.2},
        {'month': 'Fev', 'co2': 0.9},
        {'month': 'Mar', 'co2': 1.5},
        {'month': 'Abr', 'co2': 1.3},
        {'month': 'Mai', 'co2': 1.7},
        {'month': 'Jun', 'co2': 1.4},
        {'month': 'Jul', 'co2': 2.0},
        {'month': 'Ago', 'co2': 1.8},
        {'month': 'Set', 'co2': 1.9},
        {'month': 'Out', 'co2': 2.1},
        {'month': 'Nov', 'co2': 1.7},
        {'month': 'Dez', 'co2': 2.4},
    ]

    states_data = [
        {'state': 'SP', 'co2': 4.2, 'passages': 125000},
        {'state': 'RJ', 'co2': 3.1, 'passages': 89000},
        {'state': 'MG', 'co2': 2.4, 'passages': 67000},
        {'state': 'RS', 'co2': 1.8, 'passages': 51000},
        {'state': 'PR', 'co2': 1.5, 'passages': 43000},
        {'state': 'SC', 'co2': 1.2, 'passages': 35000},
        {'state': 'BA', 'co2': 0.9, 'passages': 28000},
        {'state': 'GO', 'co2': 0.6, 'passages': 17000},
    ]

    context_data = [
        {'context': 'Pedágio', 'pct': 62},
        {'context': 'Estacionamento', 'pct': 28},
        {'context': 'Acesso', 'pct': 10},
    ]

    annual_data = [
        {'year': 2022, 'co2': 8.3},
        {'year': 2023, 'co2': 11.7},
        {'year': 2024, 'co2': 14.2},
        {'year': 2025, 'co2': 16.49},
    ]

    return render(request, 'core/b2b.html', {
        'monthly_data': json.dumps(monthly_data),
        'states_data': json.dumps(states_data),
        'context_data': json.dumps(context_data),
        'annual_data': json.dumps(annual_data),
        'monthly_list': monthly_data,
        'states_list': states_data,
        'kpis': {
            'co2_total': 16.49,
            'passagens': 455000,
            'estados': 22,
            'ranking': 4,
        },
    })


def faq(request):
    query = request.GET.get('q', '').strip()
    category = request.GET.get('cat', '')

    faqs = FAQ.objects.filter(is_active=True)
    if query:
        faqs = faqs.filter(question__icontains=query) | faqs.filter(answer__icontains=query)
    if category:
        faqs = faqs.filter(category=category)

    # Add sample FAQs if none exist
    if not FAQ.objects.exists():
        _seed_faqs()
        faqs = FAQ.objects.filter(is_active=True)

    categories = FAQ.CATEGORY_CHOICES

    return render(request, 'core/faq.html', {
        'faqs': faqs,
        'query': query,
        'category': category,
        'categories': categories,
    })


def metodologia(request):
    return render(request, 'core/methodology.html')


def historico(request):
    if not request.user.is_authenticated:
        return redirect('login')
    passages = request.user.passages.select_related('vehicle').all()[:50]
    return render(request, 'core/history.html', {'passages': passages})


# --- Vehicle CRUD ---

@login_required
def vehicle_list(request):
    vehicles = request.user.vehicles.all()
    return render(request, 'core/vehicles.html', {'vehicles': vehicles})


@login_required
def vehicle_create(request):
    if request.method == 'POST':
        form = VehicleForm(request.POST)
        if form.is_valid():
            vehicle = form.save(commit=False)
            vehicle.user = request.user
            vehicle.save()
            messages.success(request, 'Veículo adicionado com sucesso!')
            return redirect('meu_impacto')
    else:
        form = VehicleForm()
    return render(request, 'core/vehicle_form.html', {'form': form, 'action': 'Adicionar'})


@login_required
def vehicle_edit(request, pk):
    vehicle = get_object_or_404(Vehicle, pk=pk, user=request.user)
    if request.method == 'POST':
        form = VehicleForm(request.POST, instance=vehicle)
        if form.is_valid():
            form.save()
            messages.success(request, 'Veículo atualizado com sucesso!')
            return redirect('meu_impacto')
    else:
        form = VehicleForm(instance=vehicle)
    return render(request, 'core/vehicle_form.html', {'form': form, 'action': 'Editar', 'vehicle': vehicle})


@login_required
def vehicle_delete(request, pk):
    vehicle = get_object_or_404(Vehicle, pk=pk, user=request.user)
    if request.method == 'POST':
        vehicle.delete()
        messages.success(request, 'Veículo removido.')
        return redirect('meu_impacto')
    return render(request, 'core/vehicle_confirm_delete.html', {'vehicle': vehicle})


def _seed_faqs():
    """Populate FAQ with initial data."""
    items = [
        ('O que é o TagGreen?', 'O TagGreen é uma plataforma que calcula e exibe o impacto ambiental positivo gerado pelo uso de tags de automação de pagamentos em pedágios, estacionamentos e controles de acesso.', 'geral', 1),
        ('Como funciona o cálculo de CO2?', 'O cálculo é baseado na Metodologia TagGreen v1.0, que considera tempo de idle do motor, distância extra percorrida e papel evitado em cada passagem. Os fatores de emissão são do IPCC e ONS 2023.', 'calculadora', 2),
        ('Qual é a diferença entre os tipos de passagem?', 'Pedágio, estacionamento e controle de acesso têm tempos de espera e distâncias extras diferentes. O pedágio tem maior impacto por conta do tempo de fila e emissão de comprovante.', 'calculadora', 3),
        ('Como faço para cadastrar meu veículo?', 'Após criar sua conta, acesse "Meu Impacto" e clique em "Adicionar Veículo". Informe modelo, ano, tipo de combustível e placa.', 'uso', 4),
        ('Posso ter mais de um veículo cadastrado?', 'Sim! Você pode cadastrar quantos veículos quiser. Defina um como "veículo principal" para que ele apareça em destaque no seu dashboard.', 'uso', 5),
        ('Como funciona o sistema de níveis?', 'O sistema de níveis é baseado no número total de passagens registradas: Básico (0-49), Intermediário (50-199), Avançado (200-499) e Expert (500+).', 'uso', 6),
        ('Como faço para cancelar minha conta?', 'Para cancelar, acesse as configurações da conta e clique em "Encerrar conta". Todos os seus dados serão removidos permanentemente após 30 dias.', 'cancelamento', 7),
        ('Os dados são precisos?', 'Os dados são baseados em metodologia científica, mas podem variar conforme o modelo específico do veículo, condições de tráfego e outros fatores regionais.', 'impacto', 8),
        ('O que é CO2 equivalente (CO2e)?', 'CO2e é uma medida que agrupa diferentes gases de efeito estufa em uma unidade comum baseada no potencial de aquecimento global do CO2 ao longo de 100 anos.', 'impacto', 9),
        ('Como funciona a cobrança do serviço?', 'O TagGreen Dashboard é gratuito para usuários individuais. Para empresas, consulte nossos planos B2B na seção de área corporativa.', 'cobranca', 10),
        ('Posso exportar meus dados?', 'Sim! No dashboard, clique em "Exportar" para baixar um relatório PDF ou CSV com seu histórico completo de passagens e impacto ambiental.', 'uso', 11),
        ('O que é o TagWrapped?', 'O TagWrapped é um resumo anual do seu impacto ambiental, gerado automaticamente no final de cada ano, com seus principais resultados e conquistas.', 'uso', 12),
        ('Como funciona a área B2B?', 'A área B2B oferece dashboards corporativos com visão consolidada de toda a frota, relatórios ESG, análise por estado e ranking setorial.', 'geral', 13),
        ('Qual é a metodologia usada?', 'Utilizamos a Metodologia TagGreen v1.0, desenvolvida com base em dados do IPCC, SEEG Brasil, ONS 2023 e ABNT. Acesse a página de Metodologia para o documento completo.', 'calculadora', 14),
    ]
    for q, a, cat, order in items:
        FAQ.objects.get_or_create(question=q, defaults={'answer': a, 'category': cat, 'order': order})
