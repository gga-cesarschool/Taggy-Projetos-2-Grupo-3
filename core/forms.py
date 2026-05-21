from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import AuthenticationForm
from .models import UserProfile, Vehicle


class LoginForm(AuthenticationForm):
    username = forms.CharField(
        label='E-mail ou usuário',
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'seu@email.com'}),
    )
    password = forms.CharField(
        label='Senha',
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': '••••••••'}),
    )


class RegisterPessoaForm(forms.ModelForm):
    first_name = forms.CharField(
        label='Nome', max_length=100,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Seu nome'}),
    )
    last_name = forms.CharField(
        label='Sobrenome', max_length=100,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Seu sobrenome'}),
    )
    email = forms.EmailField(
        label='E-mail',
        widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'seu@email.com'}),
    )
    password1 = forms.CharField(
        label='Senha',
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': '••••••••'}),
    )
    password2 = forms.CharField(
        label='Confirmar senha',
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': '••••••••'}),
    )
    cpf = forms.CharField(
        label='CPF', max_length=14, required=False,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': '000.000.000-00'}),
    )
    phone = forms.CharField(
        label='Telefone', max_length=20, required=False,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': '(11) 99999-9999'}),
    )

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email']

    def clean_email(self):
        email = self.cleaned_data['email']
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError('Este e-mail já está cadastrado.')
        return email

    def clean(self):
        cleaned_data = super().clean()
        p1 = cleaned_data.get('password1')
        p2 = cleaned_data.get('password2')
        if p1 and p2 and p1 != p2:
            self.add_error('password2', 'As senhas não coincidem.')
        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)
        user.username = self.cleaned_data['email']
        user.set_password(self.cleaned_data['password1'])
        if commit:
            user.save()
            UserProfile.objects.create(
                user=user,
                user_type='pessoa',
                cpf_cnpj=self.cleaned_data.get('cpf', ''),
                phone=self.cleaned_data.get('phone', ''),
            )
        return user


class RegisterEmpresaForm(forms.ModelForm):
    company_name = forms.CharField(
        label='Razão Social', max_length=200,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Nome da empresa'}),
    )
    cnpj = forms.CharField(
        label='CNPJ', max_length=18,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': '00.000.000/0001-00'}),
    )
    email = forms.EmailField(
        label='E-mail corporativo',
        widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'empresa@dominio.com.br'}),
    )
    password1 = forms.CharField(
        label='Senha',
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': '••••••••'}),
    )
    password2 = forms.CharField(
        label='Confirmar senha',
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': '••••••••'}),
    )
    state = forms.ChoiceField(
        label='Estado', required=False,
        choices=[('', 'Selecione')] + [(s, s) for s in [
            'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
            'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
        ]],
        widget=forms.Select(attrs={'class': 'form-select'}),
    )

    class Meta:
        model = User
        fields = ['email']

    def clean(self):
        cleaned_data = super().clean()
        p1 = cleaned_data.get('password1')
        p2 = cleaned_data.get('password2')
        if p1 and p2 and p1 != p2:
            self.add_error('password2', 'As senhas não coincidem.')
        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)
        user.username = self.cleaned_data['email']
        user.first_name = self.cleaned_data['company_name']
        user.set_password(self.cleaned_data['password1'])
        if commit:
            user.save()
            UserProfile.objects.create(
                user=user,
                user_type='empresa',
                cpf_cnpj=self.cleaned_data.get('cnpj', ''),
                company_name=self.cleaned_data.get('company_name', ''),
                state=self.cleaned_data.get('state', ''),
            )
        return user


class VehicleForm(forms.ModelForm):
    class Meta:
        model = Vehicle
        fields = ['name', 'nickname', 'year', 'category', 'fuel', 'plate', 'is_primary']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ex: Civic, Corolla...'}),
            'nickname': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Apelido (opcional)'}),
            'year': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '2024'}),
            'category': forms.Select(attrs={'class': 'form-select'}),
            'fuel': forms.Select(attrs={'class': 'form-select'}),
            'plate': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'ABC-1234'}),
            'is_primary': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }
        labels = {
            'name': 'Modelo',
            'nickname': 'Apelido',
            'year': 'Ano',
            'category': 'Categoria',
            'fuel': 'Combustível',
            'plate': 'Placa',
            'is_primary': 'Veículo principal',
        }


class CalculatorForm(forms.Form):
    VEHICLE_CHOICES = [
        ('combustao', 'Carro (Combustão)'),
        ('eletrico', 'Carro Elétrico'),
        ('moto', 'Moto'),
        ('caminhao', 'Caminhão'),
    ]
    CONTEXT_CHOICES = [
        ('pedagio', 'Pedágio'),
        ('estacionamento', 'Estacionamento'),
        ('acesso', 'Controle de Acesso'),
    ]

    vehicle_type = forms.ChoiceField(
        choices=VEHICLE_CHOICES, label='Tipo de veículo',
        widget=forms.RadioSelect(attrs={'class': 'btn-check'}),
    )
    context_type = forms.ChoiceField(
        choices=CONTEXT_CHOICES, label='Tipo de passagem',
        widget=forms.RadioSelect(attrs={'class': 'btn-check'}),
    )
    passagens = forms.IntegerField(
        min_value=1, max_value=200, initial=10, label='Passagens por mês',
        widget=forms.NumberInput(attrs={'class': 'form-range', 'type': 'range', 'min': '1', 'max': '200'}),
    )
