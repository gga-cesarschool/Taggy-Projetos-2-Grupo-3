from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Perfil


class PerfilInline(admin.StackedInline):
    model         = Perfil
    can_delete    = False
    verbose_name  = 'Perfil TagGreen'
    verbose_name_plural = 'Perfil TagGreen'

    fieldsets = (
        ('Tipo de conta', {
            'fields': ('tipo',),
        }),
        ('Dados da empresa', {
            'fields': ('nome_empresa', 'cnpj', 'tipo_servico'),
            'description': 'Preenchido apenas para contas do tipo Empresa.',
        }),
        ('Auditoria', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',),
        }),
    )
    readonly_fields = ('criado_em', 'atualizado_em')


class UserAdmin(BaseUserAdmin):
    inlines       = (PerfilInline,)
    list_display  = ('email', 'first_name', 'last_name', 'tipo_conta', 'tipo_servico', 'is_active', 'date_joined')
    list_filter   = BaseUserAdmin.list_filter + ('perfil__tipo', 'perfil__tipo_servico')
    search_fields = ('email', 'first_name', 'last_name', 'perfil__nome_empresa', 'perfil__cnpj')

    def tipo_conta(self, obj):
        try:
            return obj.perfil.get_tipo_display()
        except Exception:
            return '—'
    tipo_conta.short_description = 'Tipo'

    def tipo_servico(self, obj):
        try:
            return obj.perfil.get_tipo_servico_display() or '—'
        except Exception:
            return '—'
    tipo_servico.short_description = 'Serviço'


@admin.register(Perfil)
class PerfilAdmin(admin.ModelAdmin):
    list_display   = ('usuario', 'tipo', 'nome_empresa', 'cnpj', 'tipo_servico', 'criado_em')
    list_filter    = ('tipo', 'tipo_servico')
    search_fields  = ('usuario__email', 'usuario__first_name', 'nome_empresa', 'cnpj')
    readonly_fields = ('criado_em', 'atualizado_em')

    fieldsets = (
        ('Usuário', {
            'fields': ('usuario', 'tipo'),
        }),
        ('Dados da empresa', {
            'fields': ('nome_empresa', 'cnpj', 'tipo_servico'),
            'classes': ('collapse',),
        }),
        ('Auditoria', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',),
        }),
    )


# Substitui o UserAdmin padrão pelo nosso (com PerfilInline)
admin.site.unregister(User)
admin.site.register(User, UserAdmin)