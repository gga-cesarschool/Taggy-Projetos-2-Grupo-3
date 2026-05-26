from django.contrib import admin
from .models import Veiculo, VeiculoEmpresa


class VeiculoEmpresaInline(admin.TabularInline):
    model        = VeiculoEmpresa
    extra        = 0
    autocomplete_fields = ['empresa']
    verbose_name = 'Empresa vinculada'
    verbose_name_plural = 'Empresas vinculadas'


@admin.register(Veiculo)
class VeiculoAdmin(admin.ModelAdmin):
    list_display   = ('nome', 'tipo', 'placa', 'usuario', 'ativo', 'criado_em')
    list_filter    = ('tipo', 'ativo')
    search_fields  = ('nome', 'placa', 'usuario__email', 'usuario__first_name')
    list_editable  = ('ativo',)
    readonly_fields = ('criado_em',)
    inlines        = [VeiculoEmpresaInline]

    fieldsets = (
        ('Veículo', {
            'fields': ('usuario', 'nome', 'tipo', 'placa', 'ativo'),
        }),
        ('Auditoria', {
            'fields': ('criado_em',),
            'classes': ('collapse',),
        }),
    )


@admin.register(VeiculoEmpresa)
class VeiculoEmpresaAdmin(admin.ModelAdmin):
    list_display  = ('veiculo', 'empresa_nome', 'tipo_servico', 'criado_em')
    list_filter   = ('empresa__perfil__tipo_servico',)
    search_fields = ('veiculo__nome', 'empresa__perfil__nome_empresa', 'empresa__email')
    readonly_fields = ('criado_em',)

    def empresa_nome(self, obj):
        try:
            return obj.empresa.perfil.nome_empresa
        except Exception:
            return obj.empresa.email
    empresa_nome.short_description = 'Empresa'

    def tipo_servico(self, obj):
        try:
            return obj.empresa.perfil.get_tipo_servico_display()
        except Exception:
            return '—'
    tipo_servico.short_description = 'Tipo de serviço'