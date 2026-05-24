from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('meu-impacto/', views.meu_impacto, name='meu_impacto'),
    path('metodologia/', views.metodologia, name='metodologia'),
    path('faq/', views.faq, name='faq'),
    path('api/fatores-emissao/', views.fatores_emissao, name='fatores_emissao'),
    path('empresas/relatorios/', views.empresas_relatorios, name='empresas_relatorios'),
    path('api/empresas/dados/', views.api_empresas_dados, name='api_empresas_dados'),
]