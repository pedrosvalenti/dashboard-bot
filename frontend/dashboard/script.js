// === API CONFIG ===
const API_BASE = (window.API_BASE || 'http://localhost:3001');
async function api(path, opts={}) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...opts });
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
  return res.json();
}
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeEventListeners();
    initializeChart();
    loadUserServers(); // Carrega os servidores do usuário
    loadDashboardData();
    applyUserFromSession();
});

// ===== NAVEGAÇÃO ENTRE SEÇÕES =====
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const dashboardSections = document.querySelectorAll('.dashboard-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetSectionId = item.getAttribute('data-section');

            // Remover classe active de todos os itens
            navItems.forEach(nav => nav.classList.remove('active'));
            dashboardSections.forEach(section => section.classList.remove('active'));

            // Adicionar classe active ao item clicado
            item.classList.add('active');

            // Mostrar seção alvo
            const targetSection = document.getElementById(targetSectionId);
            if (targetSection) {
                targetSection.classList.add('active');
                // Scroll para o topo
                document.querySelector('.main-content').scrollTop = 0;
            }
        });
    });
}

// Função para carregar os servidores do usuário
async function loadUserServers() {
  try {
    const guilds = await api('/api/guilds'); // backend filtra por admin
    const serverSelect = document.getElementById('server-select');
    if (!serverSelect) return;

    serverSelect.innerHTML = '';
    guilds.forEach(guild => {
      const option = document.createElement('option');
      option.value = guild.id;
      option.textContent = guild.name;
      serverSelect.appendChild(option);
    });

    // carrega o primeiro servidor
    if (guilds.length > 0) {
      await loadServerData(guilds[0].id);
    } else {
      showNotification('Você não é admin em nenhum servidor.', 'warning');
    }

    // troca de servidor
    serverSelect.onchange = (e) => loadServerData(e.target.value);

    showNotification('Servidores carregados', 'success');
  } catch (e) {
    console.error('loadUserServers falhou:', e);
    showNotification('Erro ao carregar servidores. Faça login novamente.', 'error');
    // se quiser, redirecione:
    // window.location.href = '/index.html';
  }
}

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    // Seletor de servidor
    const serverSelect = document.getElementById('server-select');
    if (serverSelect) {
        serverSelect.addEventListener('change', (event) => {
            const selectedServer = event.target.options[event.target.selectedIndex].text;
            showNotification(`Carregando dados do servidor: ${selectedServer}`, 'info');
            loadServerData(event.target.value);
        });
    }

    // Botões de salvar configurações
    const saveButtons = document.querySelectorAll('.btn-primary');
    saveButtons.forEach(button => {
        button.addEventListener('click', handleSaveSettings);
    });

    // Botão de notificações
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', handleNotifications);
    }

    // Botão de logout
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Botão de atualizar
    const refreshBtn = document.querySelector('.btn-secondary');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            location.reload();
        });
    }
}

// ===== HANDLERS DE EVENTOS =====
function handleServerChange(event) {
    const selectedServer = event.target.options[event.target.selectedIndex].text;
    showNotification(`Carregando dados do servidor: ${selectedServer}`, 'info');
    
    // Simulação de carregamento
    setTimeout(() => {
        showNotification(`Dashboard atualizado para: ${selectedServer}`, 'success');
        loadDashboardData();
    }, 1000);
}

function handleSaveSettings(event) {
    event.preventDefault();
    showNotification('Configurações salvas com sucesso!', 'success');
    
    // Aqui você faria uma chamada AJAX/Fetch para enviar os dados
    console.log('Salvando configurações...');
}

function handleNotifications(event) {
    event.preventDefault();
    showNotification('Você tem 3 notificações não lidas', 'info');
}

function handleLogout(event) {
    event.preventDefault();
    if (confirm('Tem certeza que deseja sair?')) {
        sessionStorage.removeItem('discord_token');
        showNotification('Saindo...', 'info');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 1000);
    }
}

// Função para carregar dados do servidor selecionado
async function loadServerData(serverId) {
    try {
        // busca dados do backend (envia cookie automaticamente com credentials: 'include' no helper api())
        const { guild, stats } = await api(`/api/guilds/${serverId}/stats`);

        // Atualiza ícone, se houver
        if (guild && guild.icon) {
            const serverIcon = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
            const el = document.querySelector('.server-selector i');
            if (el) el.style.backgroundImage = `url(${serverIcon})`;
        }

        // Atualiza header/nome do servidor, se você tiver essa função
        if (typeof updateDashboardWithServerData === 'function') {
            updateDashboardWithServerData({
                name: guild?.name || 'Servidor',
                icon: guild?.icon || null,
                id: guild?.id || serverId
            });
        }

        console.log(stats)

        // Atualiza estatísticas (com fallback)
        updateDashboardStats(stats || { 
            members: 0,
          online_members: 0,
          text_channels: 0,
          voice_channels: 0,
          commands: 0,
          uptime: '—'
        });

    } catch (e) {
        console.error('loadServerData falhou:', e);
        showNotification('Erro ao carregar dados do servidor', 'error');
    }
}


// Nova função para atualizar estatísticas do dashboard
function updateDashboardStats(data) {
    console.log(data)
    const statValues = document.querySelectorAll('.stat-value');
    // Atualizar número de membros
    if (statValues[0]) {
        statValues[0].textContent = typeof data.members === 'number' ? formatNumber(data.members) : data.members;
        const statChange = statValues[0].nextElementSibling;
        if (statChange) {
            statChange.textContent = ` ${data.online_members} membros no online`;
        }
    }
    
    // Atualizar número de membros online
    if (statValues[1]) {
        statValues[1].textContent = typeof data.channels === 'number' ? formatNumber(data.channels) : data.channels;
        const statChange = statValues[1].nextElementSibling;
        if (statChange) {
            statChange.textContent = `${data.text_channels} canais de texto, ${data.voice_channels} de voz`;
        }
    }
    
    // Atualizar comandos usados
    if (statValues[2]) {
        statValues[2].textContent = formatNumber(data.commands);
        const statChange = statValues[2].nextElementSibling;
        if (statChange) {
            statChange.textContent = `+${Math.floor(data.commands * 0.05)} hoje`;
        }
    }
    
    // Atualizar status do bot
    if (statValues[3]) {
        statValues[3].textContent = data.uptime.charAt(0).toUpperCase() + data.uptime.slice(1);
        const statChange = statValues[3].nextElementSibling;
        if (statChange) {
            statChange.textContent = `Ping: ${Math.floor(Math.random() * 30) + 20}ms`;
        }
    }
}

function updateDashboardWithServerData(serverData) {
    // Atualizar elementos do dashboard com os dados do servidor
    document.querySelector('.header-subtitle').textContent = `Gerenciando ${serverData.name}`;
    
    // Atualizar estatísticas
    const statValues = document.querySelectorAll('.stat-value');
    if (statValues.length >= 1) {
        statValues[0].textContent = serverData.approximate_member_count || 'N/A';
    }
    if (statValues.length >= 2) {
        const channels = serverData.channels?.length || 'N/A';
        statValues[1].textContent = channels;
    }

    // Atualizar outras informações do servidor conforme necessário
}

// ===== GRÁFICO COM CHART.JS =====
function initializeChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'],
            datasets: [
                {
                    label: 'Mensagens',
                    data: [120, 150, 200, 180, 220, 250, 300],
                    borderColor: '#7289da',
                    backgroundColor: 'rgba(114, 137, 218, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#7289da',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                },
                {
                    label: 'Comandos',
                    data: [80, 100, 120, 110, 140, 160, 180],
                    borderColor: '#43b581',
                    backgroundColor: 'rgba(67, 181, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#43b581',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#f0f0f0',
                        font: {
                            family: "'Poppins', sans-serif",
                            size: 12,
                            weight: '500'
                        },
                        padding: 15,
                        usePointStyle: true,
                    }
                },
                filler: {
                    propagate: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(58, 63, 91, 0.3)',
                        drawBorder: false,
                    },
                    ticks: {
                        color: '#b0b0b0',
                        font: {
                            family: "'Poppins', sans-serif",
                            size: 11
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false,
                    },
                    ticks: {
                        color: '#b0b0b0',
                        font: {
                            family: "'Poppins', sans-serif",
                            size: 11
                        }
                    }
                }
            }
        }
    });

    return chart;
}

// ===== CARREGAR DADOS DO DASHBOARD =====
function loadDashboardData() {
    // Simulação de carregamento de dados
    console.log('Carregando dados do dashboard...');
    
    // Aqui você faria chamadas AJAX/Fetch para carregar dados do backend
    // Exemplo:
    // fetch('/api/dashboard/stats')
    //     .then(response => response.json())
    //     .then(data => updateDashboardStats(data))
    //     .catch(error => console.error('Erro ao carregar dados:', error));
    
    // Por enquanto, apenas uma simulação
    animateStatCards();
}

// ===== ANIMAR CARDS DE ESTATÍSTICAS =====
function animateStatCards() {
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// ===== SISTEMA DE NOTIFICAÇÕES =====
function showNotification(message, type = 'info') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Adicionar estilos de notificação se não existirem
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: #2d3047;
                border: 1px solid #3a3f5b;
                border-radius: 8px;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 15px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                animation: slideIn 0.3s ease-out;
                z-index: 9999;
                max-width: 400px;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }

            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
                color: #f0f0f0;
                font-size: 0.95rem;
            }

            .notification-success {
                border-left: 4px solid #43b581;
            }

            .notification-success .notification-content i {
                color: #43b581;
            }

            .notification-error {
                border-left: 4px solid #f04747;
            }

            .notification-error .notification-content i {
                color: #f04747;
            }

            .notification-warning {
                border-left: 4px solid #faa61a;
            }

            .notification-warning .notification-content i {
                color: #faa61a;
            }

            .notification-info {
                border-left: 4px solid #7289da;
            }

            .notification-info .notification-content i {
                color: #7289da;
            }

            .notification-close {
                background: none;
                border: none;
                color: #b0b0b0;
                cursor: pointer;
                font-size: 1rem;
                transition: all 0.3s;
            }

            .notification-close:hover {
                color: #f0f0f0;
            }
        `;
        document.head.appendChild(style);
    }

    // Adicionar ao DOM
    document.body.appendChild(notification);

    // Botão de fechar
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    });

    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// ===== OBTER ÍCONE DE NOTIFICAÇÃO =====
function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Função para atualizar as informações do usuário
function updateUserInfo(userData) {
    // Atualizar nome do usuário
    const usernameEl = document.querySelector('.username');
    if (usernameEl) {
        usernameEl.textContent = userData.username;
    }

    // Atualizar avatar do usuário
    const userAvatarEl = document.querySelector('.user-avatar');
    if (userAvatarEl) {
        const avatarUrl = userData.avatar 
            ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png?size=128`
            : 'https://discord.com/assets/default-avatar.png';
        userAvatarEl.src = avatarUrl;
    }

    // Atualizar avatar do bot
    const botAvatarEl = document.querySelector('.bot-avatar');
    if (botAvatarEl) {
        // Para o bot, vamos usar o CLIENT_ID que está armazenado no sessionStorage
        const clientId = sessionStorage.getItem('client_id');
        if (clientId) {
            fetch(`https://discord.com/api/v10/applications/${clientId}`, {
                headers: {
                    Authorization: `Bearer ${sessionStorage.getItem('discord_token')}`
                }
            })
            .then(response => response.json())
            .then(botData => {
                if (botData.icon) {
                    botAvatarEl.src = `https://cdn.discordapp.com/app-icons/${clientId}/${botData.icon}.png?size=128`;
                }
            })
            .catch(console.error);
        }
    }
}

// ===== FUNÇÕES AUXILIARES =====

// Formatar números com separadores
function formatNumber(num) {
    return num
    // return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Obter data formatada
function getFormattedDate() {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('pt-BR', options);
}

// Verificar se o usuário está autenticado
async function checkAuthentication() {
    try {
        const me = await api('/api/auth/me');
        const userAvatarEl = document.querySelector('.user-avatar');
        if (userAvatarEl && me.user?.avatar && me.user?.id) {
            userAvatarEl.src = `https://cdn.discordapp.com/avatars/${me.user.id}/${me.user.avatar}.png?size=128`;
        }
    } catch (e) {
        // não autenticado
        console.log('Usuário não autenticado, redirecionando para login...');
        window.location.href = '/index.html';
    }

    // Aqui você verificaria se o usuário está logado
    // Se não estiver, redirecionar para login
    console.log('Verificando autenticação...');
}

async function applyUserFromSession() {
  try {
    const { user } = await api('/api/auth/me'); // api() precisa usar credentials:'include'
    if (!user) return;

    const displayName = user.global_name || user.username || 'Usuário';

    // Trata avatar Discord: gif se começar com 'a_', senão png; se for nulo, usa default
    let avatarUrl;
    if (user.avatar) {
      const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
      avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
    } else {
      // default avatars 0..4 — usa um índice determinístico
      const idx = Number(BigInt(user.id) % 5n);
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
    }

    // Atualiza UI (ajuste os seletores para os seus elementos)
    const nameEl = document.querySelector('.username, #userName, [data-user-name]');
    const avatarEl = document.querySelector('.user-avatar, #userAvatar, [data-user-avatar]');
    if (nameEl) nameEl.textContent = displayName;
    if (avatarEl) avatarEl.src = avatarUrl;

  } catch (e) {
    console.warn('applyUserFromSession falhou:', e);
    // se 401, manda pro login
    // window.location.href = '/index.html';
  }
}

// chame isso no seu bootstrap:
document.addEventListener('DOMContentLoaded', () => {
  applyUserFromSession();
});


// ===== EXPORTAR FUNÇÕES =====
window.dashboardUtils = {
    formatNumber,
    getFormattedDate,
    showNotification,
    loadDashboardData
};