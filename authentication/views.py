import re
from django.shortcuts import render, redirect
from django.contrib.auth import (
    authenticate,
    login  as auth_login,
    logout as auth_logout,
)
from django.contrib.auth.models import User
from .models import Perfil


# =============================================================================
# LOGIN
# =============================================================================

def login(request):
    if request.user.is_authenticated:
        return redirect('home')

    errors    = {}
    form_data = {}

    if request.method == 'POST':
        email    = request.POST.get('email', '').strip().lower()
        password = request.POST.get('password', '')

        if not email:
            errors['email'] = 'Informe o e-mail.'
        if not password:
            errors['password'] = 'Informe a senha.'

        if not errors:
            user = authenticate(request, username=email, password=password)
            if user:
                auth_login(request, user)
                return redirect(request.GET.get('next', 'home'))
            else:
                errors['geral'] = 'E-mail ou senha incorretos.'

        form_data = {'email': email}

    return render(request, 'login.html', {
        'errors':    errors,
        'form_data': form_data,
    })


# =============================================================================
# REGISTER
# =============================================================================

def _validar_cnpj_formato(cnpj: str) -> bool:
    """Verifica apenas o formato XX.XXX.XXX/XXXX-XX (dígitos verificadores não são checados)."""
    return bool(re.fullmatch(r'\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}', cnpj))


def register(request):
    if request.user.is_authenticated:
        return redirect('home')

    errors    = {}
    form_data = {}

    if request.method == 'POST':
        tipo         = request.POST.get('tipo', 'pessoa')
        email        = request.POST.get('email', '').strip().lower()
        password     = request.POST.get('password', '')
        confirm      = request.POST.get('confirm_password', '')
        # pessoa
        nome         = request.POST.get('nome', '').strip()
        # empresa
        nome_empresa = request.POST.get('nome_empresa', '').strip()
        cnpj         = request.POST.get('cnpj', '').strip()
        tipo_servico = request.POST.get('tipo_servico', '').strip()

        # ── Validações comuns ──────────────────────────────────────────
        if not email:
            errors['email'] = 'Informe o e-mail.'
        elif User.objects.filter(username=email).exists():
            errors['email'] = 'E-mail já cadastrado.'

        if not password:
            errors['password'] = 'Informe a senha.'
        elif len(password) < 8:
            errors['password'] = 'A senha deve ter no mínimo 8 caracteres.'

        if password and confirm and password != confirm:
            errors['confirm_password'] = 'As senhas não coincidem.'

        # ── Validações por tipo ────────────────────────────────────────
        if tipo == 'pessoa':
            if not nome:
                errors['nome'] = 'Informe seu nome completo.'
        else:
            tipo = 'empresa'
            if not nome_empresa:
                errors['nome_empresa'] = 'Informe o nome da empresa.'
            if not cnpj:
                errors['cnpj'] = 'Informe o CNPJ.'
            elif not _validar_cnpj_formato(cnpj):
                errors['cnpj'] = 'CNPJ inválido. Use o formato 00.000.000/0001-00.'
            if not tipo_servico:
                errors['tipo_servico'] = 'Selecione o tipo de serviço.'

        # ── Criação ────────────────────────────────────────────────────
        if not errors:
            if tipo == 'pessoa':
                partes     = nome.split(' ', 1)
                first_name = partes[0]
                last_name  = partes[1] if len(partes) > 1 else ''
            else:
                # Para empresa usa a razão social como display name
                first_name = nome_empresa
                last_name  = ''

            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
            )

            Perfil.objects.create(
                usuario=user,
                tipo=tipo,
                nome_empresa=nome_empresa if tipo == 'empresa' else '',
                cnpj=cnpj         if tipo == 'empresa' else '',
                tipo_servico=tipo_servico if tipo == 'empresa' else '',
            )

            auth_login(request, user)
            return redirect('home')

        form_data = {
            'tipo':         tipo,
            'nome':         nome,
            'email':        email,
            'nome_empresa': nome_empresa,
            'cnpj':         cnpj,
            'tipo_servico': tipo_servico,
        }

    return render(request, 'register.html', {
        'errors':    errors,
        'form_data': form_data,
    })


# =============================================================================
# LOGOUT
# =============================================================================

def logout(request):
    auth_logout(request)
    return redirect('login')