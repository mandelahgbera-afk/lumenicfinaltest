/**
 * LUMENIC DATA — Application Form Handler
 * ========================================
 * BULLETPROOF implementation for mobile & desktop
 * 
 * Tested on:
 * - iOS Safari 15+
 * - Android Chrome
 * - Desktop Chrome/Firefox/Safari
 * 
 * Key fixes for mobile:
 * - Uses addEventListener (not onchange) for iOS Safari compatibility
 * - Uses FormData multipart upload (not base64) for efficiency
 * - Proper touch event handling
 * - Memory-efficient file processing
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    maxFileSize: 4 * 1024 * 1024, // 4MB
    maxTotalSize: 10 * 1024 * 1024, // 10MB
    apiEndpoint: '/api/submit-application',
    totalSteps: 4
  };

  // File field configuration
  const FILE_FIELDS = {
    'a-selfie': { name: 'Selfie', required: true },
    'a-id-photo-front': { name: 'ID Front', required: true },
    'a-id-photo-back': { name: 'ID Back', required: true },
    'a-cv': { name: 'CV/Resume', required: false }
  };

  // State
  let currentStep = 1;
  let isSubmitting = false;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    console.log('[Form] Initializing...');
    
    initStepNavigation();
    initFileUploads();
    initSubmitHandler();
    initValidation();
    
    goToStep(1);
    
    console.log('[Form] Ready');
  }

  // ════════════════════════════════════════════════════════════
  // STEP NAVIGATION
  // ════════════════════════════════════════════════════════════
  function initStepNavigation() {
    // Next buttons
    document.querySelectorAll('[id^="next-"]').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        const step = parseInt(this.id.split('-')[1]);
        if (validateStep(step)) {
          goToStep(step + 1);
        }
      });
    });

    // Back buttons
    document.querySelectorAll('[id^="back-"]').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        const step = parseInt(this.id.split('-')[1]);
        goToStep(step - 1);
      });
    });

    // Sidebar navigation
    document.querySelectorAll('.step-nav-item').forEach(item => {
      item.addEventListener('click', function(e) {
        e.preventDefault();
        const step = parseInt(this.dataset.step);
        if (step && step >= 1 && step <= CONFIG.totalSteps) {
          goToStep(step);
        }
      });
    });
  }

  function goToStep(step) {
    if (step < 1 || step > CONFIG.totalSteps + 1) return;

    // Hide all steps
    document.querySelectorAll('.form-step').forEach(el => {
      el.classList.remove('active');
      el.style.display = 'none';
    });
    
    document.querySelectorAll('.step-nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.mobile-step-dot').forEach(el => el.classList.remove('active'));

    const successState = document.getElementById('success-state');
    if (successState) {
      successState.classList.remove('active');
      successState.style.display = 'none';
    }

    if (step <= CONFIG.totalSteps) {
      // Show step
      const stepEl = document.getElementById(`step-${step}`);
      if (stepEl) {
        stepEl.classList.add('active');
        stepEl.style.display = 'block';
      }

      const navItem = document.querySelector(`.step-nav-item[data-step="${step}"]`);
      if (navItem) navItem.classList.add('active');

      const dot = document.querySelector(`.mobile-step-dot[data-dot="${step}"]`);
      if (dot) dot.classList.add('active');

      // Update progress bar
      const progressBar = document.getElementById('progress-bar');
      if (progressBar) {
        progressBar.style.width = ((step / CONFIG.totalSteps) * 100) + '%';
      }

      // Scroll to form
      const formArea = document.querySelector('.apply-form-area');
      if (formArea) {
        setTimeout(() => {
          formArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } else {
      // Show success
      if (successState) {
        successState.classList.add('active');
        successState.style.display = 'block';
      }
      
      const progressBar = document.getElementById('progress-bar');
      if (progressBar) progressBar.style.width = '100%';
      
      const formArea = document.querySelector('.apply-form-area');
      if (formArea) formArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    currentStep = step;
  }

  // ════════════════════════════════════════════════════════════
  // FILE UPLOAD HANDLING (iOS Safari Compatible)
  // ════════════════════════════════════════════════════════════
  function initFileUploads() {
    document.querySelectorAll('.upload-zone').forEach(zone => {
      const input = zone.querySelector('input[type="file"]');
      if (!input) return;

      const fieldName = input.id;
      const config = FILE_FIELDS[fieldName] || { name: 'File', required: false };

      // CRITICAL: Use addEventListener, NOT .onchange for iOS Safari
      input.addEventListener('change', function(e) {
        console.log(`[Form] File input change: ${fieldName}`);
        handleFileSelect(this, zone, config);
      });

      // Also listen for 'input' event (some mobile browsers)
      input.addEventListener('input', function(e) {
        console.log(`[Form] File input input: ${fieldName}`);
        handleFileSelect(this, zone, config);
      });

      // Click on zone triggers file input
      zone.addEventListener('click', function(e) {
        // Don't trigger if clicking the input itself
        if (e.target !== input) {
          input.click();
        }
      });

      // Touch events for mobile
      zone.addEventListener('touchstart', function(e) {
        e.preventDefault();
        input.click();
      }, { passive: false });

      // Keyboard accessibility
      zone.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          input.click();
        }
      });

      // Drag and drop (desktop only)
      initDragDrop(zone, input, config);
    });
  }

  function handleFileSelect(input, zone, config) {
    const files = input.files;
    
    if (!files || files.length === 0) {
      console.log(`[Form] No file selected for ${input.id}`);
      clearFileDisplay(zone, input);
      return;
    }

    const file = files[0];
    console.log(`[Form] File selected: ${input.id}`);
    console.log(`  Name: ${file.name}`);
    console.log(`  Type: ${file.type}`);
    console.log(`  Size: ${(file.size / 1024).toFixed(2)}KB`);

    // Validate file size
    if (file.size > CONFIG.maxFileSize) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      const maxMB = (CONFIG.maxFileSize / 1024 / 1024).toFixed(1);
      
      showError(zone, `${config.name} is too large (${sizeMB}MB). Max: ${maxMB}MB`);
      input.setAttribute('data-error', 'size');
      
      // Clear the input
      input.value = '';
      return;
    }

    // Clear any previous error
    clearError(zone);
    input.removeAttribute('data-error');

    // Update display
    const filenameEl = zone.querySelector('.upload-filename');
    if (filenameEl) {
      filenameEl.textContent = `✓ ${file.name}`;
      filenameEl.style.display = 'block';
      filenameEl.style.color = '#0a0a0a';
    }

    // Store file info for debugging
    input.setAttribute('data-filename', file.name);
    input.setAttribute('data-filesize', file.size);
  }

  function clearFileDisplay(zone, input) {
    const filenameEl = zone.querySelector('.upload-filename');
    if (filenameEl) {
      filenameEl.textContent = '';
      filenameEl.style.display = 'none';
    }
    
    clearError(zone);
    
    if (input) {
      input.removeAttribute('data-error');
      input.removeAttribute('data-filename');
      input.removeAttribute('data-filesize');
    }
  }

  function showError(zone, message) {
    const errorEl = zone.querySelector('.upload-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
    zone.classList.add('has-error');
    showToast(message, true);
  }

  function clearError(zone) {
    const errorEl = zone.querySelector('.upload-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
    zone.classList.remove('has-error');
  }

  function initDragDrop(zone, input, config) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      zone.addEventListener(eventName, function(e) {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      zone.addEventListener(eventName, function() {
        zone.style.borderColor = 'var(--ink)';
        zone.style.backgroundColor = 'rgba(0,0,0,0.02)';
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      zone.addEventListener(eventName, function() {
        zone.style.borderColor = '';
        zone.style.backgroundColor = '';
      });
    });

    zone.addEventListener('drop', function(e) {
      const files = e.dataTransfer.files;
      if (files.length > 1) {
        showToast('Please select only one file', true);
        return;
      }
      if (files.length > 0) {
        // Use DataTransfer to set files (iOS compatible)
        const dt = new DataTransfer();
        dt.items.add(files[0]);
        input.files = dt.files;
        
        // Trigger change event manually
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  // ════════════════════════════════════════════════════════════
  // FORM VALIDATION
  // ════════════════════════════════════════════════════════════
  function initValidation() {
    // Clear validation on input
    document.querySelectorAll('input, textarea, select').forEach(field => {
      field.addEventListener('input', function() {
        if (this.classList.contains('field-invalid')) {
          this.classList.remove('field-invalid');
          this.style.borderColor = '';
          this.style.backgroundColor = '';
        }
      });
    });
  }

  function validateStep(step) {
    const stepEl = document.getElementById(`step-${step}`);
    if (!stepEl) return false;

    let isValid = true;
    let firstInvalid = null;

    // Check required text inputs
    stepEl.querySelectorAll('input[required], textarea[required], select[required]').forEach(field => {
      if (field.type === 'file') return; // Files checked separately
      
      const value = field.value?.trim() || '';
      
      if (!value) {
        markInvalid(field);
        isValid = false;
        if (!firstInvalid) firstInvalid = field;
      }
    });

    // Check file inputs
    stepEl.querySelectorAll('input[type="file"][required]').forEach(input => {
      if (!input.files || input.files.length === 0) {
        const zone = input.closest('.upload-zone');
        const config = FILE_FIELDS[input.id] || { name: 'File' };
        showError(zone, `${config.name} is required`);
        isValid = false;
        if (!firstInvalid) firstInvalid = input;
      }
    });

    // Check radio button groups
    const radioGroups = new Set();
    stepEl.querySelectorAll('input[type="radio"][required]').forEach(r => {
      radioGroups.add(r.name);
    });
    
    radioGroups.forEach(groupName => {
      const checked = stepEl.querySelector(`input[name="${groupName}"]:checked`);
      if (!checked) {
        isValid = false;
        showToast('Please select all required options', true);
      }
    });

    // Check consent checkbox
    const consent = stepEl.querySelector('#a-consent');
    if (consent && consent.required && !consent.checked) {
      showToast('Please accept the terms to continue', true);
      isValid = false;
    }

    if (!isValid && firstInvalid) {
      showToast('Please fill all required fields', true);
      setTimeout(() => {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus();
      }, 100);
    }

    return isValid;
  }

  function markInvalid(field) {
    field.classList.add('field-invalid');
    field.style.borderColor = '#c0392b';
    field.style.backgroundColor = 'rgba(192,57,43,0.05)';
  }

  // ════════════════════════════════════════════════════════════
  // FORM SUBMISSION (Multipart FormData - NOT base64)
  // ════════════════════════════════════════════════════════════
  function initSubmitHandler() {
    const submitBtn = document.getElementById('submit-application');
    if (!submitBtn) return;

    submitBtn.addEventListener('click', async function(e) {
      e.preventDefault();

      if (isSubmitting) {
        showToast('Already submitting...', true);
        return;
      }

      // Validate final step
      if (!validateStep(CONFIG.totalSteps)) {
        return;
      }

      // Check for file errors
      const errors = document.querySelectorAll('input[data-error]');
      if (errors.length > 0) {
        showToast('Please fix file errors before submitting', true);
        return;
      }

      isSubmitting = true;
      setLoading(true);
      showToast('Submitting your application...', false);

      try {
        // Build FormData (multipart) - NOT base64 JSON
        const formData = buildFormData();
        
        console.log('[Form] Submitting...');
        console.log('  Endpoint:', CONFIG.apiEndpoint);
        
        // Log FormData contents
        const entries = [];
        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            entries.push(`${key}: File(${value.name}, ${(value.size/1024).toFixed(2)}KB)`);
          } else {
            entries.push(`${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
          }
        }
        console.log('  FormData entries:', entries);

        // Send using fetch with FormData
        const response = await fetch(CONFIG.apiEndpoint, {
          method: 'POST',
          body: formData
          // Note: Don't set Content-Type header - browser sets it with boundary
        });

        console.log('[Form] Response status:', response.status);

        let data;
        try {
          data = await response.json();
        } catch (e) {
          throw new Error('Invalid response from server');
        }

        console.log('[Form] Response:', data);

        if (!response.ok || !data.success) {
          throw new Error(data.error || `Server error: ${response.status}`);
        }

        console.log('[Form] ✓ Submission successful');
        showSuccessState();

      } catch (error) {
        console.error('[Form] ✗ Submission failed:', error);
        showToast(error.message || 'Failed to submit. Please try again.', true);
        
        isSubmitting = false;
        setLoading(false);
      }
    });
  }

  function buildFormData() {
    const formData = new FormData();

    // Add text fields
    document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input[type="number"], textarea, select').forEach(field => {
      if (field.id && field.value) {
        formData.append(field.id, field.value.trim());
      }
    });

    // Add radio buttons
    const radioGroups = new Set();
    document.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
      if (!radioGroups.has(radio.name)) {
        formData.append(radio.name, radio.value);
        radioGroups.add(radio.name);
      }
    });

    // Add checkboxes
    const checkboxGroups = {};
    document.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
      const name = cb.name || cb.id;
      if (!checkboxGroups[name]) {
        checkboxGroups[name] = [];
      }
      checkboxGroups[name].push(cb.value);
    });
    
    Object.entries(checkboxGroups).forEach(([name, values]) => {
      formData.append(name, values.join(', '));
    });

    // Add files
    Object.keys(FILE_FIELDS).forEach(fieldId => {
      const input = document.getElementById(fieldId);
      if (input && input.files && input.files[0]) {
        formData.append(fieldId, input.files[0], input.files[0].name);
      }
    });

    return formData;
  }

  function setLoading(loading) {
    const submitBtn = document.getElementById('submit-application');
    if (!submitBtn) return;

    if (loading) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.6';
      submitBtn.style.cursor = 'not-allowed';
      submitBtn.setAttribute('aria-busy', 'true');
    } else {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
      submitBtn.removeAttribute('aria-busy');
    }
  }

  function showSuccessState() {
    // Clear all fields
    document.querySelectorAll('input, textarea, select').forEach(field => {
      if (field.type === 'file') {
        field.value = '';
        field.removeAttribute('data-error');
        field.removeAttribute('data-filename');
        field.removeAttribute('data-filesize');
      } else if (field.type === 'checkbox' || field.type === 'radio') {
        field.checked = false;
      } else {
        field.value = '';
      }
      field.classList.remove('field-invalid');
      field.style.borderColor = '';
      field.style.backgroundColor = '';
    });

    // Clear file displays
    document.querySelectorAll('.upload-filename').forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });

    document.querySelectorAll('.upload-error').forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });

    document.querySelectorAll('.upload-zone').forEach(zone => {
      zone.classList.remove('has-error');
    });

    isSubmitting = false;
    setLoading(false);

    // Show success
    setTimeout(() => {
      goToStep(CONFIG.totalSteps + 1);
      showToast('Application submitted successfully!', false);
    }, 100);
  }

  // ════════════════════════════════════════════════════════════
  // TOAST NOTIFICATIONS
  // ════════════════════════════════════════════════════════════
  function showToast(message, isError) {
    let toast = document.querySelector('.toast');
    
    // Create fallback toast if not found
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:8px;color:white;font-size:14px;z-index:10000;transition:opacity 0.3s;opacity:0;';
      document.body.appendChild(toast);
    }

    toast.style.background = isError ? '#c0392b' : '#27ae60';
    toast.textContent = message;
    toast.style.opacity = '1';

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.style.opacity = '0';
    }, isError ? 5000 : 3000);
  }

})();
