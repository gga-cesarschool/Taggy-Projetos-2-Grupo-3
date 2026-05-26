from django.db import models
from django.contrib.auth.models import User


TIPO_VEICULO_CHOICES = [
    ('carro_combustao', 'Carro (Combustão)'),
    ('carro_eletrico',  'Carro (Elétrico)'),
    ('moto',            'Moto'),
    ('caminhao',        'Caminhão'),
]
TIPO_VEICULO_ICON = {
    'carro_combustao': 'directions_car',
    'carro_eletrico':  'electric_car',
    'moto':            'two_wheeler',
    'caminhao':        'local_shipping',
}
CONTEXTO_CHOICES = [
    ('pedagio',           'Pedágio'),
    ('estacionamento',    'Estacionamento'),
    ('acesso_controlado', 'Acesso Controlado'),
]


class Veiculo(models.Model):
    usuario   = models.ForeignKey(User, on_delete=models.CASCADE, related_name='veiculos')
    nome      = models.CharField(max_length=200, verbose_name='Nome do veículo')
    tipo      = models.CharField(max_length=20, choices=TIPO_VEICULO_CHOICES)
    placa     = models.CharField(max_length=10, blank=True, verbose_name='Placa')
    ativo     = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'Veículo'
        verbose_name_plural = 'Veículos'
        ordering            = ['nome']

    def __str__(self):
        return f'{self.nome} ({self.get_tipo_display()})'

    @property
    def icon(self):
        return TIPO_VEICULO_ICON.get(self.tipo, 'directions_car')


class VeiculoEmpresa(models.Model):
    veiculo   = models.ForeignKey(Veiculo, on_delete=models.CASCADE, related_name='empresas_cadastradas')
    empresa   = models.ForeignKey(User,    on_delete=models.CASCADE, related_name='veiculos_clientes')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together     = [['veiculo', 'empresa']]
        verbose_name        = 'Vínculo Veículo-Empresa'
        verbose_name_plural = 'Vínculos Veículo-Empresa'

    def __str__(self):
        try:
            return f'{self.veiculo} → {self.empresa.perfil.nome_empresa}'
        except Exception:
            return f'{self.veiculo} → Empresa #{self.empresa_id}'


class Passagem(models.Model):
    """
    Registro de passagem(ns) com CO₂e calculado e armazenado no momento
    do cadastro — snapshot metodológico para preservar o histórico.
    """
    usuario  = models.ForeignKey(User,    on_delete=models.CASCADE, related_name='passagens')
    veiculo  = models.ForeignKey(Veiculo, on_delete=models.CASCADE, related_name='passagens')
    empresa  = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='passagens_na_empresa',
        verbose_name='Empresa / Local',
    )
    contexto         = models.CharField(max_length=20, choices=CONTEXTO_CHOICES)
    data             = models.DateField(verbose_name='Data')
    quantidade       = models.PositiveIntegerField(default=1, verbose_name='Passagens')
    co2e_por_passagem = models.DecimalField(
        max_digits=10, decimal_places=6, default=0,
        verbose_name='CO₂e por passagem (kg)',
        help_text='Calculado automaticamente no momento do registro.',
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'Passagem'
        verbose_name_plural = 'Passagens'
        ordering            = ['-data', '-criado_em']

    def __str__(self):
        return f'{self.veiculo.nome} — {self.get_contexto_display()} — {self.data} (×{self.quantidade})'

    @property
    def co2e_total(self):
        return round(float(self.co2e_por_passagem) * self.quantidade, 6)