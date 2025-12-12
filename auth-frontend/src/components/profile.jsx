import React, { useEffect, useState, useCallback, useMemo } from "react"; 
import "./profile.css";
import api from "../api/api";
import {
  Edit,
  X,
  Save,
  PlusCircle,
  Trash2,
  Loader2,
  MapPin,
  CreditCard,
  User,
  Mail,
  Phone,
  Calendar,
  Navigation,
  Globe,
  Upload,
  Camera,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

// Custom hook for async operations with loading and error states
function useAsync() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (asyncFunction, onSuccess, onError) => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFunction();
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      setError(err);
      if (onError) onError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error, setError };
}

// Custom hook for modal management
function useModal() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [modalData, setModalData] = useState({});

  const openModal = useCallback((type, data = {}) => {
    setModalType(type);
    setModalData({ ...data });
    setModalOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalType("");
    setModalData({});
    document.body.style.overflow = "";
  }, []);

  return { modalOpen, modalType, modalData, openModal, closeModal, setModalData };
}

// Custom hook for avatar management
function useAvatar(initialAvatar = null) {
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  const resolveAvatarUrl = useCallback((avatarPath) => {
    if (!avatarPath) return null;
    if (/^https?:\/\//.test(avatarPath)) return avatarPath;
    return `${window.location.origin}${avatarPath.startsWith("/") ? "" : "/"}${avatarPath}`;
  }, []);

  const initializeAvatar = useCallback((avatarPath) => {
    const resolved = resolveAvatarUrl(avatarPath);
    setAvatarPreview(resolved);
  }, [resolveAvatarUrl]);

  const handleFileSelect = useCallback((file) => {
    setAvatarFile(file);
    if (file) {
      setRemoveAvatar(false);
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    }
  }, []);

  const handleRemoveAvatar = useCallback((shouldRemove) => {
    setRemoveAvatar(shouldRemove);
    if (shouldRemove) {
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  }, []);

  const resetAvatar = useCallback(() => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(false);
  }, []);

  return {
    avatarFile,
    avatarPreview,
    removeAvatar,
    initializeAvatar,
    handleFileSelect,
    handleRemoveAvatar,
    resetAvatar,
    resolveAvatarUrl,
  };
}

// Custom hook for toast notifications
function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, text, ms = 3500) => {
    setToast({ type, text, id: Date.now() });
    setTimeout(() => setToast(null), ms);
  }, []);

  return { toast, showToast };
}

// Debounce hook for API calls
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [cards, setCards] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [autoSaveLoading, setAutoSaveLoading] = useState(false);

  // Custom hooks
  const { toast, showToast } = useToast();
  const { modalOpen, modalType, modalData, openModal, closeModal, setModalData } = useModal();
  const { 
    avatarFile, 
    avatarPreview, 
    removeAvatar, 
    initializeAvatar, 
    handleFileSelect, 
    handleRemoveAvatar, 
    resetAvatar,
    resolveAvatarUrl 
  } = useAvatar();

  // Async operations
  const profileAsync = useAsync();
  const addressesAsync = useAsync();
  const cardsAsync = useAsync();
  const deleteAsync = useAsync();

  // Debounced form data for auto-save
  const debouncedProfileData = useDebounce(modalData, 1000);

  // ---------- Initial data fetching ----------
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function fetchAll() {
      try {
        const [profileData, addressesData, cardsData] = await Promise.allSettled([
          api.get("profile/", { signal: controller.signal }),
          api.get("addresses/", { signal: controller.signal }),
          api.get("payment-cards/", { signal: controller.signal }),
        ]);

        if (!mounted) return;

        // Handle profile data
        if (profileData.status === 'fulfilled') {
          setProfile(profileData.value.data || {});
          initializeAvatar(profileData.value.data?.avatar);
        } else {
          console.error('Profile fetch failed:', profileData.reason);
        }

        // Handle addresses data
        if (addressesData.status === 'fulfilled') {
          setAddresses(Array.isArray(addressesData.value.data) ? addressesData.value.data : []);
        } else {
          console.error('Addresses fetch failed:', addressesData.reason);
        }

        // Handle cards data
        if (cardsData.status === 'fulfilled') {
          setCards(Array.isArray(cardsData.value.data) ? cardsData.value.data : []);
        } else {
          console.error('Cards fetch failed:', cardsData.reason);
        }

      } catch (err) {
        if (mounted && err.name !== 'AbortError') {
          console.error("Failed to fetch account data:", err);
          showToast("error", "Failed to load account data");
        }
      } finally {
        if (mounted) setInitialLoading(false);
      }
    }

    fetchAll();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [initializeAvatar, showToast]);

  // ---------- Auto-save effect ----------
  useEffect(() => {
    if (modalType === 'profile' && Object.keys(debouncedProfileData).length > 0) {
      handleAutoSave();
    }
  }, [debouncedProfileData]);

  // ---------- Modal handlers ----------
  const handleOpenModal = useCallback((type, data = {}) => {
    openModal(type, data);
    resetAvatar();
    
    if (type === "profile") {
      const existingAvatar = data?.avatar || (profile && profile.avatar) || null;
      initializeAvatar(existingAvatar);
    }
  }, [openModal, resetAvatar, initializeAvatar, profile]);

  const handleModalChange = useCallback((field, value) => {
    setModalData(prev => ({ ...prev, [field]: value }));
  }, [setModalData]);

  // ---------- Async API functions ----------
  const handleAutoSave = useCallback(async () => {
    if (autoSaveLoading) return;

    const hasChanges = Object.keys(modalData).some(key => 
      modalData[key] !== profile?.[key]
    );

    if (!hasChanges) return;

    setAutoSaveLoading(true);
    try {
      const formData = new FormData();
      Object.keys(modalData).forEach(key => {
        if (modalData[key] !== undefined) {
          formData.append(key, modalData[key] ?? "");
        }
      });

      const res = await api.patch("profile/update/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProfile(res.data);
      showToast("success", "Profile auto-saved");
    } catch (err) {
      console.error("Auto-save error:", err);
    } finally {
      setAutoSaveLoading(false);
    }
  }, [modalData, profile, showToast, autoSaveLoading]);

  const submitProfile = useCallback(async (e) => {
    e?.preventDefault?.();
    
    const shouldReload = avatarFile || removeAvatar;

    await profileAsync.execute(
      async () => {
        const formData = new FormData();

        // Append profile fields
        const profileFields = [
          'full_name', 'bio', 'date_of_birth', 'phone_number', 
          'gender', 'preferred_payment_method', 'upi_id'
        ];
        
        profileFields.forEach(field => {
          if (modalData[field] !== undefined) {
            formData.append(field, modalData[field] ?? "");
          }
        });

        // Handle avatar
        if (avatarFile) {
          formData.append("avatar", avatarFile);
        } else if (removeAvatar) {
          formData.append("remove_avatar", "true");
        }

        const res = await api.patch("profile/update/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        return res;
      },
      (res) => {
        setProfile(res.data);
        showToast("success", "Profile updated successfully");
        closeModal();
        
        if (shouldReload) {
          setTimeout(() => window.location.reload(), 500);
        }
      },
      (err) => {
        console.error("Profile save error:", err);
        const errorMsg = err?.response?.data 
          ? JSON.stringify(err.response.data)
          : "Failed to save profile";
        showToast("error", errorMsg);
      }
    );
  }, [modalData, avatarFile, removeAvatar, profileAsync, showToast, closeModal]);

  const submitAddress = useCallback(async (e) => {
    e?.preventDefault?.();

    await addressesAsync.execute(
      async () => {
        const payload = {
          id: modalData.id,
          full_name: modalData.full_name,
          phone_number: modalData.phone_number,
          address_line1: modalData.address_line1,
          address_line2: modalData.address_line2,
          city: modalData.city,
          state: modalData.state,
          postal_code: modalData.postal_code,
          country: modalData.country,
          is_default: !!modalData.is_default,
          address_type: modalData.address_type ?? "H",
        };

        const res = await api.put("addresses/", payload);
        return res;
      },
      (res) => {
        const updatedAddress = res.data;
        
        setAddresses(prev => {
          const filtered = prev.filter(addr => addr.id !== updatedAddress.id);
          const newAddresses = modalData.id ? filtered : prev;
          
          return modalData.is_default 
            ? [updatedAddress, ...newAddresses.map(addr => ({ ...addr, is_default: false }))]
            : [updatedAddress, ...newAddresses];
        });

        showToast("success", `Address ${modalData.id ? 'updated' : 'added'} successfully`);
        closeModal();
      },
      (err) => {
        console.error("Address save error:", err);
        const errorMsg = err?.response?.data 
          ? JSON.stringify(err.response.data)
          : "Failed to save address";
        showToast("error", errorMsg);
      }
    );
  }, [modalData, addressesAsync, showToast, closeModal]);

  const submitCard = useCallback(async (e) => {
    e?.preventDefault?.();

    await cardsAsync.execute(
      async () => {
        const payload = {
          id: modalData.id,
          card_name: modalData.card_name,
          card_holder_name: modalData.card_holder_name,
          card_last4: modalData.card_last4,
          card_expiry_month: modalData.card_expiry_month,
          card_expiry_year: modalData.card_expiry_year,
          card_type: modalData.card_type,
          is_default: !!modalData.is_default,
        };

        const res = await api.put("payment-cards/", payload);
        return res;
      },
      (res) => {
        const updatedCard = res.data;
        
        setCards(prev => {
          const filtered = prev.filter(card => card.id !== updatedCard.id);
          const newCards = modalData.id ? filtered : prev;
          
          return modalData.is_default 
            ? [updatedCard, ...newCards.map(card => ({ ...card, is_default: false }))]
            : [updatedCard, ...newCards];
        });

        showToast("success", `Card ${modalData.id ? 'updated' : 'added'} successfully`);
        closeModal();
      },
      (err) => {
        console.error("Card save error:", err);
        const errorMsg = err?.response?.data 
          ? JSON.stringify(err.response.data)
          : "Failed to save card";
        showToast("error", errorMsg);
      }
    );
  }, [modalData, cardsAsync, showToast, closeModal]);

  const deleteAddress = useCallback(async (id) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;

    await deleteAsync.execute(
      async () => {
        await api.delete("addresses/", { data: { id } });
        return id;
      },
      (deletedId) => {
        setAddresses(prev => prev.filter(address => address.id !== deletedId));
        showToast("success", "Address deleted successfully");
      },
      (err) => {
        console.error("Address delete error:", err);
        showToast("error", "Failed to delete address");
      }
    );
  }, [deleteAsync, showToast]);

  const deleteCard = useCallback(async (id) => {
    if (!window.confirm("Are you sure you want to delete this card?")) return;

    await deleteAsync.execute(
      async () => {
        await api.delete("payment-cards/", { data: { id } });
        return id;
      },
      (deletedId) => {
        setCards(prev => prev.filter(card => card.id !== deletedId));
        showToast("success", "Card deleted successfully");
      },
      (err) => {
        console.error("Card delete error:", err);
        showToast("error", "Failed to delete card");
      }
    );
  }, [deleteAsync, showToast]);

  const setDefaultAddress = useCallback(async (id) => {
    await addressesAsync.execute(
      async () => {
        const res = await api.patch(`addresses/${id}/set-default/`);
        return res;
      },
      () => {
        setAddresses(prev => prev.map(address => ({
          ...address,
          is_default: address.id === id
        })));
        showToast("success", "Default address updated");
      },
      (err) => {
        console.error("Set default address error:", err);
        showToast("error", "Failed to set default address");
      }
    );
  }, [addressesAsync, showToast]);

  const setDefaultCard = useCallback(async (id) => {
    await cardsAsync.execute(
      async () => {
        const res = await api.patch(`payment-cards/${id}/set-default/`);
        return res;
      },
      () => {
        setCards(prev => prev.map(card => ({
          ...card,
          is_default: card.id === id
        })));
        showToast("success", "Default payment method updated");
      },
      (err) => {
        console.error("Set default card error:", err);
        showToast("error", "Failed to set default payment method");
      }
    );
  }, [cardsAsync, showToast]);

  // Memoized utility functions
  const getCardProviderDisplay = useCallback((card) => {
    if (card.card_name) return card.card_name;
    
    const cardType = card.card_type || '';
    const providers = {
      'Visa': 'VISA',
      'MasterCard': 'MasterCard',
      'Master': 'MasterCard',
      'American Express': 'AMEX',
      'Amex': 'AMEX',
      'Discover': 'Discover',
      'RuPay': 'RuPay',
      'Diners Club': 'Diners Club',
      'Diners': 'Diners Club',
      'JCB': 'JCB',
      'UnionPay': 'UnionPay',
      'Maestro': 'Maestro'
    };

    for (const [key, value] of Object.entries(providers)) {
      if (cardType.includes(key) || cardType === key) {
        return value;
      }
    }
    
    return 'CARD';
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  }, []);

  // Memoized computed values
  const isLoading = useMemo(() => 
    initialLoading || profileAsync.loading || addressesAsync.loading || cardsAsync.loading,
    [initialLoading, profileAsync.loading, addressesAsync.loading, cardsAsync.loading]
  );

  const hasProfileData = useMemo(() => 
    profile && Object.keys(profile).length > 0,
    [profile]
  );

  if (initialLoading) {
    return (
      <div className="loading-container">
        <Loader2 className="spin" size={36} /> 
        <span>Loading your profile...</span>
      </div>
    );
  }

  return (
    <div className="profile-page-component">
      {/* Enhanced Toast */}
      {toast && (
        <div className={`toast ${toast.type} slide-in`}>
          <div className="toast-content">
            {toast.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar-section">
          <div className="avatar-container">
            {hasProfileData && profile?.avatar ? (
              <img 
                src={resolveAvatarUrl(profile.avatar)} 
                alt="avatar" 
                className="profile-avatar" 
              />
            ) : (
              <div className="avatar-placeholder">
                {(profile?.full_name || profile?.user?.username || "U").slice(0, 2).toUpperCase()}
              </div>
            )}
            {profileAsync.loading && (
              <div className="avatar-loading-overlay">
                <Loader2 className="spin" size={20} />
              </div>
            )}
          </div>
          <div className="profile-info">
            <h1>{profile?.full_name || profile?.user?.username || "—"}</h1>
            <div className="profile-email">
              <Mail size={16} />
              {profile?.user?.email || "No email"}
            </div>
            {autoSaveLoading && (
              <div className="auto-save-indicator">
                <Loader2 size={12} className="spin" />
                <span>Auto-saving...</span>
              </div>
            )}
          </div>
        </div>
        <button 
          className="edit-profile-btn" 
          onClick={() => handleOpenModal("profile", profile)}
          disabled={profileAsync.loading}
        >
          {profileAsync.loading ? <Loader2 size={16} className="spin" /> : <Edit size={16} />}
          Edit Profile
        </button>
      </div>

      {/* Main Content */}
      <div className="profile-content-vertical">
        
        {/* Identity Card Section */}
        <section className="content-section full-width">
          <div className="section-header">
            <User size={20} className="section-icon" />
            <h2>Personal Information</h2>
          </div>
          <div className="identity-card official-id-card">
            <div className="id-card-header">
              <div className="id-card-logo">ID</div>
              <div className="id-card-title">Personal Identity</div>
            </div>
            <div className="id-card-content">
              <div className="id-card-main">
                <div className="id-card-avatar">
                  {hasProfileData && profile?.avatar ? (
                    <img src={resolveAvatarUrl(profile.avatar)} alt="avatar" />
                  ) : (
                    <div className="id-avatar-placeholder">
                      {(profile?.full_name || "U").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="id-card-personal">
                  <div className="id-card-name">{profile?.full_name || "—"}</div>
                  <div className="id-card-email">{profile?.user?.email || "—"}</div>
                </div>
              </div>
              
              <div className="id-card-grid">
                <div className="id-card-detail">
                  <Phone size={16} />
                  <div>
                    <label>Phone Number</label>
                    <p>{profile?.phone_number || "—"}</p>
                  </div>
                </div>
                <div className="id-card-detail">
                  <Calendar size={16} />
                  <div>
                    <label>Date of Birth</label>
                    <p>{formatDate(profile?.date_of_birth)}</p>
                  </div>
                </div>
                <div className="id-card-detail">
                  <User size={16} />
                  <div>
                    <label>Gender</label>
                    <p>{profile?.gender || "—"}</p>
                  </div>
                </div>
                <div className="id-card-detail">
                  <CreditCard size={16} />
                  <div>
                    <label>UPI ID</label>
                    <p>{profile?.upi_id || "—"}</p>
                  </div>
                </div>
                <div className="id-card-detail">
                  <CreditCard size={16} />
                  <div>
                    <label>Preferred Payment</label>
                    <p>{profile?.preferred_payment_method || "—"}</p>
                  </div>
                </div>
                <div className="id-card-detail">
                  <Calendar size={16} />
                  <div>
                    <label>Member Since</label>
                    <p>{formatDate(profile?.created_at)}</p>
                  </div>
                </div>
              </div>
              
              {profile?.bio && (
                <div className="bio-section">
                  <span className="detail-label">Bio</span>
                  <p className="bio-text">{profile.bio}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Addresses Section */}
        <section className="content-section full-width">
          <div className="section-header">
            <MapPin size={20} className="section-icon" />
            <h2>Saved Addresses</h2>
            <button 
              className="add-btn" 
              onClick={() => handleOpenModal("address")}
              disabled={addressesAsync.loading}
            >
              {addressesAsync.loading ? <Loader2 size={16} className="spin" /> : <PlusCircle size={16} />}
              Add Address
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="empty-state">
              <MapPin size={48} className="empty-icon" />
              <h3>No addresses saved</h3>
              <p>Add your first address to get started</p>
              <button 
                className="primary-btn" 
                onClick={() => handleOpenModal("address")}
                disabled={addressesAsync.loading}
              >
                {addressesAsync.loading ? <Loader2 size={16} className="spin" /> : <PlusCircle size={16} />}
                Add Address
              </button>
            </div>
          ) : (
            <div className="addresses-grid-horizontal">
              {addresses.map((address) => (
                <div key={address.id} className={`address-card location-card ${address.is_default ? 'default' : ''} ${address.address_type === 'H' ? 'home' : address.address_type === 'W' ? 'work' : 'other'}`}>
                  <div className="map-background">
                    <div className="map-structure">
                      <div className="map-road horizontal"></div>
                      <div className="map-road vertical"></div>
                      <div className="map-building"></div>
                      <div className="map-building"></div>
                      <div className="map-building"></div>
                    </div>
                    <div className="location-pin">
                      <Navigation size={20} />
                    </div>
                  </div>
                  
                  <div className="address-content">
                    <div className="address-header">
                      <div className="address-type-badge">
                        {address.address_type === 'H' ? '🏠 Home' : 
                         address.address_type === 'W' ? '💼 Work' : '📦 Other'}
                      </div>
                      {address.is_default && <div className="default-badge">Default</div>}
                    </div>
                    
                    <div className="address-main">
                      <h4>{address.full_name}</h4>
                      <div className="address-details">
                        <MapPin size={16} className="address-icon" />
                        <div className="address-text">
                          <p className="street">{address.address_line1}</p>
                          {address.address_line2 && <p className="street-2">{address.address_line2}</p>}
                          <p className="city-state">{address.city}, {address.state} {address.postal_code}</p>
                          <p className="country">
                            <Globe size={12} />
                            {address.country}
                          </p>
                        </div>
                      </div>
                      <div className="phone-details">
                        <Phone size={14} />
                        <span>{address.phone_number}</span>
                      </div>
                    </div>

                    <div className="card-actions visible">
                      <button 
                        className="action-btn edit" 
                        onClick={() => handleOpenModal("address", address)}
                        disabled={addressesAsync.loading}
                      >
                        {addressesAsync.loading ? <Loader2 size={14} className="spin" /> : <Edit size={14} />}
                        Edit
                      </button>
                      <button 
                        className="action-btn delete" 
                        onClick={() => deleteAddress(address.id)}
                        disabled={deleteAsync.loading}
                      >
                        {deleteAsync.loading ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Payment Cards Section */}
        <section className="content-section full-width">
          <div className="section-header">
            <CreditCard size={20} className="section-icon" />
            <h2>Payment Methods</h2>
            <button 
              className="add-btn" 
              onClick={() => handleOpenModal("card")} 
              disabled={cards.length >= 6 || cardsAsync.loading}
            >
              {cardsAsync.loading ? <Loader2 size={16} className="spin" /> : <PlusCircle size={16} />}
              Add Card
            </button>
          </div>

          {cards.length === 0 ? (
            <div className="empty-state">
              <CreditCard size={48} className="empty-icon" />
              <h3>No payment methods</h3>
              <p>Add your first payment card</p>
              <button 
                className="primary-btn" 
                onClick={() => handleOpenModal("card")}
                disabled={cardsAsync.loading}
              >
                {cardsAsync.loading ? <Loader2 size={16} className="spin" /> : <PlusCircle size={16} />}
                Add Card
              </button>
            </div>
          ) : (
            <div className="cards-grid-horizontal">
              {cards.map((card, index) => (
                <div key={card.id} className={`payment-card credit-card ${card.is_default ? 'default' : ''} ${index % 3 === 0 ? 'gradient-blue' : index % 3 === 1 ? 'gradient-purple' : 'gradient-black'}`}>
                  <div className="card-background">
                    <div className="card-chip"></div>
                    <div className="card-waves">
                      <div className="wave"></div>
                      <div className="wave"></div>
                      <div className="wave"></div>
                    </div>
                  </div>
                  
                  <div className="card-header">
                    <div className="card-provider">
                      {getCardProviderDisplay(card)}
                    </div>
                    {card.is_default && <div className="default-badge">Primary</div>}
                  </div>
                  
                  <div className="card-number">
                    <span className="card-number-block">••••</span>
                    <span className="card-number-block">••••</span>
                    <span className="card-number-block">••••</span>
                    <span className="card-number-block">{card.card_last4}</span>
                  </div>
                  
                  <div className="card-details">
                    <div className="card-holder">
                      <div className="card-label">Card Holder</div>
                      <div className="card-holder-name">{card.card_holder_name}</div>
                    </div>
                    <div className="card-expiry">
                      <div className="card-label">Expires</div>
                      <div className="expiry-date">
                        {card.card_expiry_month?.toString().padStart(2, '0')}/{card.card_expiry_year}
                      </div>
                    </div>
                  </div>
                  
                  <div className="card-actions visible">
                    
                    <button 
                      className="action-btn edit" 
                      onClick={() => handleOpenModal("card", card)}
                      disabled={cardsAsync.loading}
                    >
                      {cardsAsync.loading ? <Loader2 size={14} className="spin" /> : <Edit size={14} />}
                      Edit
                    </button>
                    <button 
                      className="action-btn delete" 
                      onClick={() => deleteCard(card.id)}
                      disabled={deleteAsync.loading}
                    >
                      {deleteAsync.loading ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalType === "profile" && "Edit Profile"}
                {modalType === "address" && (modalData?.id ? "Edit Address" : "Add Address")}
                {modalType === "card" && (modalData?.id ? "Edit Card" : "Add Card")}
              </h3>
              <button onClick={closeModal} className="close-btn" disabled={profileAsync.loading}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-scroll">
              {/* Profile Form */}
              {modalType === "profile" && (
                <form onSubmit={submitProfile}>
                  <div className="form-sections">
                    <div className="form-section">
                      <h4>Profile Picture</h4>
                      <div className="avatar-upload">
                        <label className="file-upload-label">
                          <Upload size={20} />
                          <span>Choose Avatar</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                            disabled={profileAsync.loading}
                          />
                        </label>
                        {avatarPreview && (
                          <div className="avatar-preview">
                            <img src={avatarPreview} alt="preview" />
                            <label className="checkbox-label">
                              <input 
                                type="checkbox" 
                                checked={removeAvatar} 
                                onChange={(e) => handleRemoveAvatar(!!e.target.checked)}
                                disabled={profileAsync.loading}
                              />
                              Remove current avatar
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-section">
                      <h4>Personal Information</h4>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Full name</label>
                          <input 
                            type="text" 
                            value={modalData?.full_name || ""} 
                            onChange={(e) => handleModalChange("full_name", e.target.value)} 
                            disabled={profileAsync.loading}
                          />
                        </div>
                        <div className="form-group">
                          <label>Phone number</label>
                          <input 
                            type="tel" 
                            value={modalData?.phone_number || ""} 
                            onChange={(e) => handleModalChange("phone_number", e.target.value)} 
                            disabled={profileAsync.loading}
                          />
                        </div>
                        <div className="form-group">
                          <label>Date of Birth</label>
                          <input 
                            type="date" 
                            value={modalData?.date_of_birth || ""} 
                            onChange={(e) => handleModalChange("date_of_birth", e.target.value)} 
                            disabled={profileAsync.loading}
                          />
                        </div>
                        <div className="form-group">
                          <label>Gender</label>
                          <select 
                            value={modalData?.gender || ""} 
                            onChange={(e) => handleModalChange("gender", e.target.value)}
                            disabled={profileAsync.loading}
                          >
                            <option value="">Select</option>
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                            <option value="O">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="form-section">
                      <h4>Payment Information</h4>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>UPI ID</label>
                          <input 
                            type="text" 
                            value={modalData?.upi_id || ""} 
                            onChange={(e) => handleModalChange("upi_id", e.target.value)} 
                            disabled={profileAsync.loading}
                          />
                        </div>
                        <div className="form-group">
                          <label>Preferred payment method</label>
                          <input 
                            type="text" 
                            value={modalData?.preferred_payment_method || ""} 
                            onChange={(e) => handleModalChange("preferred_payment_method", e.target.value)} 
                            disabled={profileAsync.loading}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-section">
                      <h4>Bio</h4>
                      <div className="form-group">
                        <textarea 
                          value={modalData?.bio || ""} 
                          onChange={(e) => handleModalChange("bio", e.target.value)} 
                          rows={4}
                          placeholder="Tell us about yourself..."
                          disabled={profileAsync.loading}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button 
                      type="submit" 
                      className="primary-btn" 
                      disabled={profileAsync.loading}
                    >
                      {profileAsync.loading ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                      {profileAsync.loading ? "Saving..." : "Save Changes"}
                    </button>
                    <button 
                      type="button" 
                      className="secondary-btn" 
                      onClick={closeModal}
                      disabled={profileAsync.loading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Address Form */}
              {modalType === "address" && (
                <form onSubmit={submitAddress}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Full name *</label>
                      <input 
                        type="text" 
                        value={modalData?.full_name || ""} 
                        onChange={(e) => handleModalChange("full_name", e.target.value)} 
                        required 
                        disabled={addressesAsync.loading}
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone *</label>
                      <input 
                        type="tel" 
                        value={modalData?.phone_number || ""} 
                        onChange={(e) => handleModalChange("phone_number", e.target.value)} 
                        required 
                        disabled={addressesAsync.loading}
                      />
                    </div>
                    <div className="form-group">
                      <label>Address line 1 *</label>
                      <input 
                        type="text" 
                        value={modalData?.address_line1 || ""} 
                        onChange={(e) => handleModalChange("address_line1", e.target.value)} 
                        required 
                        disabled={addressesAsync.loading}
                      />
                    </div>
                    <div className="form-group">
                      <label>Address line 2</label>
                      <input 
                        type="text" 
                        value={modalData?.address_line2 || ""} 
                        onChange={(e) => handleModalChange("address_line2", e.target.value)} 
                        disabled={addressesAsync.loading}
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>City *</label>
                        <input 
                          type="text" 
                          value={modalData?.city || ""} 
                          onChange={(e) => handleModalChange("city", e.target.value)} 
                          required 
                          disabled={addressesAsync.loading}
                        />
                      </div>
                      <div className="form-group">
                        <label>State *</label>
                        <input 
                          type="text" 
                          value={modalData?.state || ""} 
                          onChange={(e) => handleModalChange("state", e.target.value)} 
                          required 
                          disabled={addressesAsync.loading}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Postal code *</label>
                        <input 
                          type="text" 
                          value={modalData?.postal_code || ""} 
                          onChange={(e) => handleModalChange("postal_code", e.target.value)} 
                          required 
                          disabled={addressesAsync.loading}
                        />
                      </div>
                      <div className="form-group">
                        <label>Country</label>
                        <input 
                          type="text" 
                          value={modalData?.country || ""} 
                          onChange={(e) => handleModalChange("country", e.target.value)} 
                          disabled={addressesAsync.loading}
                        />
                      </div>
                    </div>
                    <div className="form-options">
                      <div className="form-group checkbox-group">
                        <input 
                          id="is_default" 
                          type="checkbox" 
                          checked={!!modalData?.is_default} 
                          onChange={(e) => handleModalChange("is_default", e.target.checked)} 
                          disabled={addressesAsync.loading}
                        />
                        <label htmlFor="is_default">Set as default address</label>
                      </div>
                      <div className="form-group">
                        <select 
                          value={modalData?.address_type || "H"} 
                          onChange={(e) => handleModalChange("address_type", e.target.value)}
                          disabled={addressesAsync.loading}
                        >
                          <option value="H">Home</option>
                          <option value="W">Work</option>
                          <option value="O">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button 
                      type="submit" 
                      className="primary-btn" 
                      disabled={addressesAsync.loading}
                    >
                      {addressesAsync.loading ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                      {addressesAsync.loading ? "Saving..." : "Save Address"}
                    </button>
                    <button 
                      type="button" 
                      className="secondary-btn" 
                      onClick={closeModal}
                      disabled={addressesAsync.loading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Card Form */}
              {modalType === "card" && (
                <form onSubmit={submitCard}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Card holder name *</label>
                      <input 
                        type="text" 
                        value={modalData?.card_holder_name || ""} 
                        onChange={(e) => handleModalChange("card_holder_name", e.target.value)} 
                        required 
                        disabled={cardsAsync.loading}
                      />
                    </div>
                    <div className="form-group">
                      <label>Last 4 digits *</label>
                      <input 
                        type="text" 
                        maxLength={4} 
                        value={modalData?.card_last4 || ""} 
                        onChange={(e) => handleModalChange("card_last4", e.target.value)} 
                        required 
                        disabled={cardsAsync.loading}
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Expiry month (MM) *</label>
                        <input 
                          type="text" 
                          maxLength={2} 
                          value={modalData?.card_expiry_month || ""} 
                          onChange={(e) => handleModalChange("card_expiry_month", e.target.value)} 
                          required 
                          disabled={cardsAsync.loading}
                        />
                      </div>
                      <div className="form-group">
                        <label>Expiry year (YYYY) *</label>
                        <input 
                          type="text" 
                          maxLength={4} 
                          value={modalData?.card_expiry_year || ""} 
                          onChange={(e) => handleModalChange("card_expiry_year", e.target.value)} 
                          required 
                          disabled={cardsAsync.loading}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Card Type</label>
                      <select 
                        value={modalData?.card_type || ""} 
                        onChange={(e) => handleModalChange("card_type", e.target.value)}
                        disabled={cardsAsync.loading}
                      >
                        <option value="">Select Card Type</option>
                        <option value="Visa">Visa</option>
                        <option value="MasterCard">MasterCard</option>
                        <option value="American Express">American Express</option>
                        <option value="Discover">Discover</option>
                        <option value="RuPay">RuPay</option>
                        <option value="Diners Club">Diners Club</option>
                        <option value="JCB">JCB</option>
                        <option value="UnionPay">UnionPay</option>
                        <option value="Maestro">Maestro</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="form-group checkbox-group">
                      <input 
                        id="card_is_default" 
                        type="checkbox" 
                        checked={!!modalData?.is_default} 
                        onChange={(e) => handleModalChange("is_default", e.target.checked)} 
                        disabled={cardsAsync.loading}
                      />
                      <label htmlFor="card_is_default">Set as default payment method</label>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button 
                      type="submit" 
                      className="primary-btn" 
                      disabled={cardsAsync.loading}
                    >
                      {cardsAsync.loading ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                      {cardsAsync.loading ? "Saving..." : "Save Card"}
                    </button>
                    <button 
                      type="button" 
                      className="secondary-btn" 
                      onClick={closeModal}
                      disabled={cardsAsync.loading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}