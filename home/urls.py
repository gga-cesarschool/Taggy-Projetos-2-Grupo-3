from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('meu-impacto/', views.meu_impacto, name='meu_impacto'),
    path('metodologia/', views.metodologia, name='metodologia'),
    path('faq/', views.faq, name='faq'),
    path('empresas/relatorios/', views.empresas_relatorios, name='empresas_relatorios'),

    # Dados reais do painel pessoal
    path('api/meu-impacto/dados/', views.api_meu_impacto_dados, name='api_meu_impacto_dados'),

    # Passagens — CRUD
    path('api/passagens/',                           views.api_passagens_lista,     name='api_passagens_lista'),
    path('api/passagens/registrar/',                 views.api_passagem_registrar,  name='api_passagem_registrar'),
    path('api/passagens/<int:passagem_id>/excluir/', views.api_passagem_excluir,    name='api_passagem_excluir'),

    # Veículos — CRUD
    path('api/veiculos/',                            views.api_veiculos_lista,      name='api_veiculos_lista'),
    path('api/veiculos/salvar/',                     views.api_veiculo_salvar,      name='api_veiculo_salvar'),
    path('api/veiculos/<int:veiculo_id>/excluir/',   views.api_veiculo_excluir,     name='api_veiculo_excluir'),

    # Empresas parceiras
    path('api/empresas/lista/',  views.api_empresas_lista,  name='api_empresas_lista'),
    path('api/empresas/dados/',  views.api_empresas_dados,  name='api_empresas_dados'),
    path('api/fatores-emissao/', views.fatores_emissao,     name='fatores_emissao'),
    path('api/ranking/', views.api_ranking, name='api_ranking'),
    path('api/ranking/empresas/', views.api_ranking_empresas, name='api_ranking_empresas'),
]