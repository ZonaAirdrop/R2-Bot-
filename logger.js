export const log = (msg, type = 'info') => {
    const timestamp = new Date().toISOString();
    const prefix = {
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        success: '✅'
    }[type] || '';

    console.log(`[${timestamp}] ${prefix} ${msg}`);
};

export const logDivider = () => {
    console.log('='.repeat(50));
};