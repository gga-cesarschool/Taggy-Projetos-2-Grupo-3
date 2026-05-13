from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('api/fatores-emissao/', views.fatores_emissao, name='fatores_emissao'),
    path('empresas/relatorios/', views.empresas_relatorios, name='empresas_relatorios'),
    path('api/empresas/dados/', views.api_empresas_dados, name='api_empresas_dados'),
]