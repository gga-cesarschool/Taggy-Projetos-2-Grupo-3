from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class UserProfile(models.Model):
    USER_TYPE_CHOICES = [
        ('pessoa', 'Pessoa Física'),
        ('empresa', 'Empresa'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='pessoa')
    cpf_cnpj = models.CharField(max_length=20, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    company_name = models.CharField(max_length=200, blank=True)
    state = models.CharField(max_length=2, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    # XP / level system
    total_passages = models.IntegerField(default=0)
    total_co2_saved = models.FloatField(default=0.0)
    total_time_saved = models.FloatField(default=0.0)

    def get_level(self):
        passages = self.total_passages
        if passages < 50:
            return {'name': 'Básico', 'next': 'Intermediário', 'progress': passages / 50 * 100, 'xp': passages, 'xp_next': 50}
        elif passages < 200:
            return {'name': 'Intermediário', 'next': 'Avançado', 'progress': (passages - 50) / 150 * 100, 'xp': passages, 'xp_next': 200}
        elif passages < 500:
            return {'name': 'Avançado', 'next': 'Expert', 'progress': (passages - 200) / 300 * 100, 'xp': passages, 'xp_next': 500}
        else:
            return {'name': 'Expert', 'next': None, 'progress': 100, 'xp': passages, 'xp_next': None}

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} ({self.get_user_type_display()})"

    class Meta:
        verbose_name = 'Perfil de Usuário'
        verbose_name_plural = 'Perfis de Usuários'


class Vehicle(models.Model):
    CATEGORY_CHOICES = [
        ('carro', 'Carro'),
        ('moto', 'Moto'),
        ('caminhao', 'Caminhão'),
    ]
    FUEL_CHOICES = [
        ('combustao', 'Combustão'),
        ('eletrico', 'Elétrico'),
        ('hibrido', 'Híbrido'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vehicles')
    name = models.CharField(max_length=100)
    nickname = models.CharField(max_length=50, blank=True)
    year = models.CharField(max_length=4)
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES, default='carro')
    fuel = models.CharField(max_length=10, choices=FUEL_CHOICES, default='combustao')
    plate = models.CharField(max_length=10, blank=True)
    is_primary = models.BooleanField(default=False)
    total_passages = models.IntegerField(default=0)
    total_co2_saved = models.FloatField(default=0.0)
    total_time_saved = models.FloatField(default=0.0)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if self.is_primary:
            Vehicle.objects.filter(user=self.user).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.plate or 'sem placa'})"

    class Meta:
        verbose_name = 'Veículo'
        verbose_name_plural = 'Veículos'
        ordering = ['-is_primary', '-created_at']


class Passage(models.Model):
    CONTEXT_CHOICES = [
        ('pedagio', 'Pedágio'),
        ('estacionamento', 'Estacionamento'),
        ('acesso', 'Controle de Acesso'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='passages')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True)
    context = models.CharField(max_length=20, choices=CONTEXT_CHOICES, default='pedagio')
    quantity = models.IntegerField(default=1)
    co2_saved = models.FloatField(default=0.0)
    time_saved = models.FloatField(default=0.0)
    fuel_saved = models.FloatField(default=0.0)
    date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.user.username} - {self.context} - {self.date}"

    class Meta:
        verbose_name = 'Passagem'
        verbose_name_plural = 'Passagens'
        ordering = ['-date']


class MonthlyStatistic(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='monthly_stats')
    year = models.IntegerField()
    month = models.IntegerField()
    total_passages = models.IntegerField(default=0)
    total_co2_saved = models.FloatField(default=0.0)
    total_time_saved = models.FloatField(default=0.0)
    total_fuel_saved = models.FloatField(default=0.0)

    class Meta:
        verbose_name = 'Estatística Mensal'
        verbose_name_plural = 'Estatísticas Mensais'
        unique_together = ['user', 'year', 'month']
        ordering = ['-year', '-month']

    def __str__(self):
        return f"{self.user.username} - {self.month}/{self.year}"


class FAQ(models.Model):
    CATEGORY_CHOICES = [
        ('uso', 'Uso da Tag'),
        ('cobranca', 'Cobrança'),
        ('cancelamento', 'Cancelamento'),
        ('impacto', 'Impacto Ambiental'),
        ('calculadora', 'Calculadora'),
        ('geral', 'Geral'),
    ]

    question = models.CharField(max_length=300)
    answer = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='geral')
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'FAQ'
        verbose_name_plural = 'FAQs'
        ordering = ['order', 'category']

    def __str__(self):
        return self.question
