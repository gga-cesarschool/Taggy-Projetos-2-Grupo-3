from django.shortcuts import render

def home(request):
    return render(request, 'home.html', {'active_page': 'home'})


def metodologia(request):
    return render(request, 'metodologia.html', {'active_page': 'metodologia'})
