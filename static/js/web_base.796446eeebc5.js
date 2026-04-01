let navItem = document.querySelectorAll('.top-nav');
let active = document.querySelector('.nav-item .nav-link.active');

document.querySelectorAll('.dropdown-btn').forEach(element => {
    element.addEventListener('click', (event) => {
        element.parentElement.nextElementSibling.classList.toggle('show');
    });
});

navItem.forEach(element => {
    if (window.innerWidth >= 992) {
        element.addEventListener('mouseover', (event) => {
            element.querySelector('.dropdown-menu')?.classList.add('show');
            element.querySelector('.nav-link').classList.add('hover');
            active?.classList.remove('active');
        });
    
        element.addEventListener('mouseout', (event) => {
            element.querySelector('.dropdown-menu')?.classList.remove('show');
            element.querySelector('.nav-link').classList.remove('hover');
            active?.classList.add('active');
        });
    }
});

window.addEventListener('scroll', () => {
    let img = document.querySelector('#logo');
    let nav = document.querySelector('.navbar');

    if (window.scrollY > 30) {
        img.classList.add('scale-img');
        nav.classList.add('scale-nav');
    } else {
        img.classList.remove('scale-img');
        nav.classList.remove('scale-nav');
    }
});
