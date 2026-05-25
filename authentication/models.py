from django.db import models
from django.contrib.auth.models import User


class Perfil(models.Model):
    """
    Estende o User padrão do Django com informações
    específicas de pessoa física ou empresa.
    """

    TIPO_CHOICES = [
        ('pessoa',  'Pessoa Física'),
        ('empresa', 'Empresa'),
    ]

    usuario      = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='perfil',
    )
    tipo         = models.CharField(
        max_length=10,
        choices=TIPO_CHOICES,
        default='pessoa',
        verbose_name='Tipo de conta',
    )

    # Campos exclusivos de empresa
    nome_empresa = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='Nome da empresa',
    )
    cnpj         = models.CharField(
        max_length=18,   # formato: XX.XXX.XXX/XXXX-XX
        blank=True,
        verbose_name='CNPJ',
    )

    criado_em    = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'Perfil'
        verbose_name_plural = 'Perfis'

    def __str__(self):
        if self.tipo == 'empresa':
            return f'{self.nome_empresa} [{self.usuario.email}]'
        return f'{self.usuario.get_full_name() or self.usuario.email} [{self.tipo}]'

    @property
    def display_name(self):
        """Nome de exibição para uso nos templates."""
        if self.tipo == 'empresa':
            return self.nome_empresa
        return self.usuario.first_name or self.usuario.email

    @property
    def is_empresa(self):
        return self.tipo == 'empresa'