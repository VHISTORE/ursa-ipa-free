document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => {
        // Убираем активный класс у всех
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        
        // Добавляем нажатой кнопке
        button.classList.add('active');
        
        // Логика смены контента
        const target = button.getAttribute('data-target');
        console.log("Переключено на:", target);
        // Здесь позже добавим функцию загрузки данных
    });
});
