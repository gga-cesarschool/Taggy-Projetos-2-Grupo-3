from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('calculadora/', views.calculadora, name='calculadora'),
    path('api/calcular/', views.calcular_api, name='calcular_api'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('meu-impacto/', views.meu_impacto, name='meu_impacto'),
    path('wrapped/', views.wrapped, name='wrapped'),
    path('b2b/', views.b2b, name='b2b'),
    path('faq/', views.faq, name='faq'),
    path('metodologia/', views.metodologia, name='metodologia'),
    path('historico/', views.historico, name='historico'),
    # Vehicles
    path('veiculos/', views.vehicle_list, name='vehicle_list'),
    path('veiculos/novo/', views.vehicle_create, name='vehicle_create'),
    path('veiculos/<int:pk>/editar/', views.vehicle_edit, name='vehicle_edit'),
    path('veiculos/<int:pk>/excluir/', views.vehicle_delete, name='vehicle_delete'),
]
