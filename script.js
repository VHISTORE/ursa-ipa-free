document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => {
        // Сброс активного класса
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        // Установка активного класса на нажатую кнопку
        button.classList.add('active');
        
        const target = button.getAttribute('data-target');
        console.log(`Раздел: ${target}`);
        
        // Здесь мы позже добавим логику смены контента
    });
});
