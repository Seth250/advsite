from django.urls import path

from . import views

app_name = 'core'


urlpatterns = [
    path('', views.DocumentIndexView.as_view(), name='document-index'),
    path('<str:filename>/', views.DocumentDetailView.as_view(), name='document-detail'),
    path('<str:filename>/value-count/', views.DocumentValueCountView.as_view(),
         name='document-value-count')
]
