import { supabase } from '../lib/supabase';

/**
 * Servicio de autenticación
 * Maneja login, logout y sesión del usuario
 */

export const authService = {
  /**
   * Iniciar sesión con email y contraseña
   */
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (/banned/i.test(error.message)) {
        throw new Error('Esta cuenta está bloqueada.');
      }
      if (/invalid login credentials/i.test(error.message)) {
        throw new Error('Email o contraseña incorrectos.');
      }
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Cerrar sesión
   */
  async logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Obtener la sesión actual
   */
  async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      throw new Error(error.message);
    }

    return session;
  },

  /**
   * Obtener el usuario actual
   */
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      throw new Error(error.message);
    }

    return user;
  },

  /**
   * Escuchar cambios en el estado de autenticación
   * @param {Function} callback - función que recibe (event, session)
   * @returns {Object} subscription - objeto con unsubscribe()
   */
  onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
  },
};
