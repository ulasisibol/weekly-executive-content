import { Providers } from '@microsoft/mgt-element';
import { Week, Day, Video } from './types';

// SharePoint Site ve Liste Bilgileri
const SHAREPOINT_SITE_URL = 'https://pakyurektarim1.sharepoint.com/sites/mezzeMarinMarkaletiimi';
const LIST_NAME = 'HaftalikIcerik';
// NOT: DOCUMENT_LIBRARY_NAME artık kullanılmıyor - getDriveId() fonksiyonu
// dil bağımsız olarak varsayılan belge kitaplığını bulmak için `/sites/{siteId}/drive` endpoint'ini kullanıyor
// const DOCUMENT_LIBRARY_NAME = 'Documents'; // Shared Documents (KULLANILMIYOR - Türkçe sistemde "Belgeler" olabilir)

// Cache için
let cachedSiteId: string | null = null;
let cachedListId: string | null = null;
let cachedDriveId: string | null = null;

const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

// Graph API Helper Fonksiyonlar
const getAccessToken = async (): Promise<string> => {
  const provider = Providers.globalProvider;
  if (!provider) {
    throw new Error('Authentication provider bulunamadı');
  }

  // Defensive Coding: Account kontrolü
  let account: any = null;
  try {
    if (typeof (provider as any).getAccount === 'function') {
      account = await (provider as any).getAccount();
    }
  } catch (e) {
    console.warn('getAccessToken: getAccount hatası:', e);
  }
  
  if (!account) {
    throw new Error('Kullanıcı giriş yapmamış');
  }

  const token = await provider.getAccessToken({
    scopes: ['Sites.ReadWrite.All', 'Files.ReadWrite.All', 'User.Read']
  });

  if (!token) {
    throw new Error('Access token alınamadı');
  }

  return token;
};

const graphRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = await getAccessToken();
  
  console.log('Graph API Request:', endpoint, options.method || 'GET');
  
  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'HonorNonIndexedQueriesWarningMayFailRandomly',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Graph API Hatası:', {
      endpoint,
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    throw new Error(`Graph API hatası: ${response.status} - ${errorText}`);
  }

  return response.json();
};

// Site ID'yi bul (cache'lenmiş değilse)
const getSiteId = async (): Promise<string> => {
  if (cachedSiteId) {
    return cachedSiteId;
  }

  try {
    // Site URL'sinden hostname ve site path'i çıkar
    const url = new URL(SHAREPOINT_SITE_URL);
    const hostname = url.hostname;
    const sitePath = url.pathname;

    // Graph API ile site bilgisini al
    const endpoint = `/sites/${hostname}:${sitePath}`;
    const siteData = await graphRequest(endpoint);
    if (!siteData?.id || typeof siteData.id !== 'string') {
      throw new Error('Site ID alınamadı');
    }
    cachedSiteId = siteData.id;
    return siteData.id;
  } catch (error) {
    console.error('Site ID bulunamadı:', error);
    throw error;
  }
};

// List ID'yi bul (cache'lenmiş değilse)
const getListId = async (): Promise<string> => {
  if (cachedListId) {
    return cachedListId;
  }

  try {
    const siteId = await getSiteId();
    console.log('Liste aranıyor:', LIST_NAME);
    
    // Önce tüm listeleri al ve filtrele
    const lists = await graphRequest(`/sites/${siteId}/lists?$select=id,displayName,name`);
    
    console.log('Bulunan listeler:', lists.value?.map((l: any) => ({ id: l.id, displayName: l.displayName, name: l.name })));
    
    const foundList = lists.value?.find((list: any) => 
      list.displayName === LIST_NAME || list.name === LIST_NAME
    );
    
    if (!foundList || !foundList.id || typeof foundList.id !== 'string') {
      throw new Error(`Liste bulunamadı: ${LIST_NAME}. Mevcut listeler: ${lists.value?.map((l: any) => l.displayName || l.name).join(', ') || 'yok'}`);
    }

    cachedListId = foundList.id;
    console.log('List ID bulundu:', cachedListId);
    return foundList.id;
  } catch (error) {
    console.error('List ID bulunamadı:', error);
    throw error;
  }
};

// Drive ID'yi bul - Dilden bağımsız varsayılan belge kitaplığı (Documents/Belgeler)
// NOT: `/sites/{siteId}/drive` endpoint'i dil bağımsız olarak varsayılan belge kitaplığını döndürür
// Bu sayede Türkçe SharePoint'te "Belgeler", İngilizce'de "Documents" otomatik bulunur
const getDriveId = async (): Promise<string> => {
  if (cachedDriveId) {
    return cachedDriveId;
  }

  try {
    const siteId = await getSiteId();
    console.log('🔍 Varsayılan belge kitaplığı aranıyor (dil bağımsız)...');
    
    // ESKİ VE HATALI (İsme bağımlı - Türkçe sistemde çalışmıyor):
    // const drives = await graphRequest(`/sites/${siteId}/drives?$filter=name eq 'Documents'`);
    
    // YENİ VE DOĞRU (Dilden bağımsız - Documents/Belgeler otomatik bulunur):
    const drive = await graphRequest(`/sites/${siteId}/drive`);
    
    if (!drive?.id || typeof drive.id !== 'string') {
      throw new Error('Varsayılan belge kitaplığı bulunamadı');
    }

    cachedDriveId = drive.id;
    console.log('✅ Drive ID bulundu (varsayılan belge kitaplığı):', cachedDriveId);
    console.log('📚 Kütüphane adı:', drive.name || 'Bilinmiyor');
    return drive.id;
  } catch (error) {
    console.error('❌ Drive ID bulunamadı:', error);
    throw error;
  }
};

// Yardımcı Fonksiyonlar
// Güvenli tarih parse fonksiyonu
const parseDate = (dateInput: string | Date | undefined | null): Date | null => {
  // Boş/undefined/null kontrolü
  if (dateInput === null || dateInput === undefined) {
    return null;
  }
  
  // Boş string kontrolü
  if (typeof dateInput === 'string' && dateInput.trim() === '') {
    return null;
  }

  let date: Date;
  
  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (trimmed === '') {
      return null;
    }
    
    // ISO formatını dene (YYYY-MM-DD veya YYYY-MM-DDTHH:mm:ss)
    if (trimmed.includes('T')) {
      date = new Date(trimmed);
    } else {
      // Sadece tarih varsa UTC olarak parse et
      date = new Date(trimmed + 'T00:00:00Z');
    }
  } else {
    console.error('parseDate: Geçersiz tarih tipi:', typeof dateInput, dateInput);
    return null;
  }

  // Tarih geçerli mi kontrol et
  if (isNaN(date.getTime())) {
    console.error('parseDate: Geçersiz tarih değeri:', dateInput, '->', date);
    return null;
  }

  return date;
};

// Güvenli tarih string'e çevirme
const getDateString = (date: Date | null): string => {
  if (!date) {
    console.error('getDateString: Geçersiz tarih objesi (null)');
    throw new Error('Geçersiz tarih objesi: null');
  }

  // Tarih geçerli mi kontrol et
  if (isNaN(date.getTime())) {
    console.error('getDateString: Geçersiz tarih değeri:', date);
    throw new Error(`Geçersiz tarih değeri: ${date}`);
  }

  try {
    const adjustedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    const isoString = adjustedDate.toISOString();
    return isoString.split('T')[0];
  } catch (error) {
    console.error('getDateString: toISOString hatası:', error, 'Tarih:', date);
    throw new Error(`Tarih dönüşümü başarısız: ${error}`);
  }
};

const getDayOfWeek = (dateString: string): string => {
  if (!dateString) {
    console.error('getDayOfWeek: Boş tarih string');
    return 'Bilinmeyen';
  }

  const date = parseDate(dateString);
  if (!date) {
    console.error('getDayOfWeek: Geçersiz tarih string:', dateString);
    return 'Bilinmeyen';
  }

  return dayNames[date.getUTCDay()];
};

// SharePoint List Item'ı Week tipine dönüştür
const mapListItemToWeek = (item: any, schema?: any): Week => {
  const fields = item.fields || {};
  
  // GÖREV 1: Debug Logları - SharePoint'ten gelen ham veriyi göster
  console.log('🔍 SharePoint Raw Item Fields:', fields);
  console.log('🔍 SharePoint Raw Item Keys:', Object.keys(fields || {}));
  console.log('🔍 SharePoint Raw Item Values (ilk 20):', 
    Object.keys(fields).slice(0, 20).reduce((acc: any, key) => {
      const value = fields[key];
      if (value !== null && value !== undefined) {
        acc[key] = typeof value === 'string' 
          ? (value.length > 100 ? value.substring(0, 100) + '...' : value)
          : value;
      }
      return acc;
    }, {})
  );
  
  // Tarih içeren tüm alanları bul (debug için)
  const dateRelatedFields = Object.keys(fields).filter(k => {
    const lower = k.toLowerCase();
    return lower.includes('date') || 
           lower.includes('tarih') || 
           lower.includes('start') || 
           lower.includes('end') ||
           lower.includes('begin') ||
           lower.includes('finish');
  });
  console.log('📅 Tarih ile ilgili alanlar:', dateRelatedFields.map(k => ({
    key: k,
    value: fields[k],
    type: typeof fields[k]
  })));
  
  // GÖREV 2: Akıllı Mapping Fonksiyonu - Tüm olası varyasyonları dener
  const findFieldValue = (displayName: string, alternativeNames: string[] = []): any => {
    const searchNames = [displayName, ...alternativeNames];
    const allSearchNames = new Set<string>();
    
    // Tüm olası varyasyonları oluştur
    for (const name of searchNames) {
      // Temel varyasyonlar
      allSearchNames.add(name);
      allSearchNames.add(name.toLowerCase());
      allSearchNames.add(name.toUpperCase());
      
      // OData prefix'li varyasyonlar
      allSearchNames.add(`OData__${name}`);
      allSearchNames.add(`OData__${name.replace(/\s/g, '_')}`);
      allSearchNames.add(`OData__${name.replace(/\s/g, '_').toLowerCase()}`);
      
      // Underscore ile boşluk değiştirme
      allSearchNames.add(name.replace(/\s/g, '_'));
      allSearchNames.add(name.replace(/\s/g, '_').toLowerCase());
      
      // x0020 ile boşluk (SharePoint encoding)
      allSearchNames.add(name.replace(/\s/g, '_x0020_'));
      allSearchNames.add(name.replace(/\s/g, '_x0020_').toLowerCase());
      
      // x0031, x0032 gibi sayısal encoding'ler
      allSearchNames.add(name.replace(/\s/g, '_x0031_'));
      allSearchNames.add(name.replace(/\s/g, '_x0032_'));
      
      // Türkçe karakterler için
      const turkishVariations = name
        .replace(/ş/g, 's')
        .replace(/Ş/g, 'S')
        .replace(/ğ/g, 'g')
        .replace(/Ğ/g, 'G')
        .replace(/ü/g, 'u')
        .replace(/Ü/g, 'U')
        .replace(/ö/g, 'o')
        .replace(/Ö/g, 'O')
        .replace(/ç/g, 'c')
        .replace(/Ç/g, 'C')
        .replace(/ı/g, 'i')
        .replace(/İ/g, 'I');
      allSearchNames.add(turkishVariations);
      allSearchNames.add(turkishVariations.toLowerCase());
    }
    
    // Önce schema'dan alan ismini bul (case-insensitive ve partial match)
    let fieldName: string | null = null;
    if (schema?.columns) {
      for (const searchName of allSearchNames) {
        const searchLower = searchName.toLowerCase();
        const col = schema.columns.find((c: any) => {
          const colName = (c.name || '').toLowerCase();
          const colDisplayName = (c.displayName || '').toLowerCase();
          return colName === searchLower || 
                 colDisplayName === searchLower ||
                 colName.includes(searchLower) ||
                 colDisplayName.includes(searchLower) ||
                 searchLower.includes(colName) ||
                 searchLower.includes(colDisplayName);
        });
        if (col) {
          fieldName = col.name;
          console.log(`✅ Schema'dan bulundu: ${displayName} -> ${col.name} (${col.displayName})`);
          break;
        }
      }
    }
    
    // Schema'dan bulamadıysak, direkt fields içinde ara (case-insensitive ve partial match)
    if (!fieldName) {
      const fieldKeys = Object.keys(fields);
      for (const searchName of allSearchNames) {
        const searchLower = searchName.toLowerCase();
        const foundKey = fieldKeys.find(key => {
          const keyLower = key.toLowerCase();
          return keyLower === searchLower ||
                 keyLower.includes(searchLower) ||
                 searchLower.includes(keyLower);
        });
        if (foundKey) {
          const value = fields[foundKey];
          if (value !== undefined && value !== null && value !== '') {
            fieldName = foundKey;
            console.log(`✅ Fields'den bulundu: ${displayName} -> ${foundKey}`);
            break;
          }
        }
      }
    }
    
    if (fieldName) {
      const value = fields[fieldName];
      // Boş string, null, undefined kontrolü
      if (value === '' || value === null || value === undefined) {
        console.warn(`⚠️ Alan bulundu ama değer boş: ${fieldName}`);
        return null;
      }
      return value;
    }
    
    console.warn(`❌ Alan bulunamadı: ${displayName} (${alternativeNames.join(', ')})`);
    return null;
  };
  
  // JSON alanlarını parse et - Görselde Days yok, boş array döndür
  let days: Day[] = [];
  try {
    const daysValue = findFieldValue('Days', [
      'DaysJson', 
      'days', 
      'daysJson',
      'Days_x0020_Json',
      'Gunler',
      'Günler'
    ]);
    if (daysValue) {
      days = typeof daysValue === 'string' ? JSON.parse(daysValue) : daysValue;
    } else {
      // Days alanı yoksa boş array - uygulama çalışmaya devam eder
      console.warn('⚠️ Days alanı bulunamadı, boş array kullanılıyor');
      days = [];
    }
  } catch (e) {
    console.error('Days parse hatası:', e);
    days = [];
  }

  // Alan değerlerini al
  const title = findFieldValue('Title', ['Başlık', 'title']) || `Hafta ${item.id}`;
  
  // GÖREV 3: Mapping Fonksiyonunu "Kör Uçuş" Moduna Al - Görseldeki gerçek sütun isimlerini kullan
  // Görselde WeekDate var, StartDate/EndDate yok - WeekDate'i kullan
  let startDate = findFieldValue('WeekDate', [
    'Week_x0020_Date',
    'Week Date',
    'weekDate',
    'StartDate', // Fallback
    'Start_x0020_Date', 
    'Start Date', 
    'startDate', 
    'StartDate0',
    'OData__StartDate',
    'OData__Start_x0020_Date',
    'OData__WeekDate',
    'Başlangıç Tarihi',
    'BaslangicTarihi',
    'Baslangic',
    'HaftaBaslangic',
    'WeekStart',
    'Week_x0020_Start',
    'field_1',
    'field1',
    'Column1',
    'Sütun1'
  ]);
  
  // EndDate için de WeekDate'i dene (veya StartDate'ten 7 gün sonrasını hesapla)
  let endDate = findFieldValue('WeekDate', [
    'Week_x0020_Date',
    'Week Date',
    'weekDate',
    'EndDate', // Fallback
    'End_x0020_Date', 
    'End Date', 
    'endDate', 
    'EndDate0',
    'OData__EndDate',
    'OData__End_x0020_Date',
    'OData__WeekDate',
    'Bitiş Tarihi',
    'BitisTarihi',
    'Bitis',
    'HaftaBitis',
    'WeekEnd',
    'Week_x0020_End',
    'field_2',
    'field2',
    'Column2',
    'Sütun2'
  ]);
  
  // Eğer WeekDate bulunduysa ve StartDate/EndDate yoksa, WeekDate'ten 7 günlük aralık oluştur
  if (startDate && !endDate) {
    const weekDateParsed = parseDate(startDate);
    if (weekDateParsed) {
      const weekStart = getWeekStartDate(weekDateParsed);
      const weekEnd = getWeekEndDate(weekStart);
      startDate = getDateString(weekStart);
      endDate = getDateString(weekEnd);
      console.log('📅 WeekDate bulundu, 7 günlük aralık oluşturuldu:', { startDate, endDate });
    }
  }
  
  // Eğer tarih alanları bulunamadıysa, varsayılan değer ata (bugün)
  const today = new Date();
  const defaultStartDate = getDateString(getWeekStartDate(today));
  const defaultEndDate = getDateString(getWeekEndDate(getWeekStartDate(today)));
  
  if (!startDate || startDate === '') {
    const dateFields = Object.keys(fields).filter(k => {
      const lower = k.toLowerCase();
      return lower.includes('date') || 
             lower.includes('start') || 
             lower.includes('tarih') ||
             lower.includes('begin') ||
             lower.includes('from');
    });
    console.warn('⚠️ StartDate alanı bulunamadı veya boş, varsayılan tarih kullanılıyor:', {
      itemId: item.id,
      availableDateFields: dateFields,
      defaultStartDate,
      allFields: Object.keys(fields)
    });
    startDate = defaultStartDate; // Varsayılan: Bugünden itibaren hafta başlangıcı
  } else {
    // Tarih string'ini normalize et
    if (typeof startDate === 'string') {
      const parsed = parseDate(startDate);
      if (parsed) {
        startDate = getDateString(parsed);
      } else {
        console.warn('⚠️ StartDate parse edilemedi, varsayılan kullanılıyor:', startDate);
        startDate = defaultStartDate;
      }
    } else if (startDate instanceof Date) {
      startDate = getDateString(startDate);
    } else {
      console.warn('⚠️ StartDate beklenmeyen tip, varsayılan kullanılıyor:', typeof startDate);
      startDate = defaultStartDate;
    }
  }
  
  if (!endDate || endDate === '') {
    const dateFields = Object.keys(fields).filter(k => {
      const lower = k.toLowerCase();
      return lower.includes('date') || 
             lower.includes('end') || 
             lower.includes('tarih') ||
             lower.includes('finish') ||
             lower.includes('to');
    });
    console.warn('⚠️ EndDate alanı bulunamadı veya boş, varsayılan tarih kullanılıyor:', {
      itemId: item.id,
      title: fields.Title || fields.title || 'N/A',
      availableDateFields: dateFields,
      defaultEndDate,
      allFields: Object.keys(fields)
    });
    endDate = defaultEndDate; // Varsayılan: Bugünden itibaren hafta bitişi
  } else {
    // Tarih string'ini normalize et
    if (typeof endDate === 'string') {
      const parsed = parseDate(endDate);
      if (parsed) {
        endDate = getDateString(parsed);
      } else {
        console.warn('⚠️ EndDate parse edilemedi, varsayılan kullanılıyor:', endDate);
        endDate = defaultEndDate;
      }
    } else if (endDate instanceof Date) {
      endDate = getDateString(endDate);
    } else {
      console.warn('⚠️ EndDate beklenmeyen tip, varsayılan kullanılıyor:', typeof endDate);
      endDate = defaultEndDate;
    }
  }
  
  const statusValue = findFieldValue('Status', ['Durum', 'status']);
  const status = (statusValue === 'published' || statusValue === 'draft') 
                  ? statusValue : 'draft';

  return {
    id: item.id,
    title,
    startDate: startDate || '',
    endDate: endDate || '',
    status: status as 'published' | 'draft',
    days: days || []
  };
};

// Week tipini SharePoint List Item'a dönüştür
const mapWeekToListItem = async (week: Week): Promise<any> => {
  // Liste şemasını al
  const schema = await getListSchema();
  
  if (!schema?.columns) {
    throw new Error('Liste şeması alınamadı');
  }
  
  // Tüm mevcut alanları logla
  const allFields = schema.columns.map((c: any) => ({
    name: c.name,
    displayName: c.displayName,
    readOnly: c.readOnly
  }));
  
  console.log('Mevcut liste alanları:', allFields);
  
  // Her alan için mevcut olup olmadığını kontrol et
  const findField = (displayName: string, alternativeNames: string[] = []): string | null => {
    const searchNames = [displayName, ...alternativeNames];
    for (const searchName of searchNames) {
      const col = schema.columns.find((c: any) => 
        c.displayName === searchName || 
        c.name === searchName ||
        c.name.toLowerCase() === searchName.toLowerCase()
      );
      if (col) {
        console.log(`Alan bulundu: ${displayName} -> ${col.name}`);
        return col.name;
      }
    }
    console.warn(`Alan bulunamadı: ${displayName}`);
    return null;
  };
  
  // Sadece mevcut alanları kullan
  const fields: any = {};
  
  // Title - her zaman mevcut olmalı
  const titleField = findField('Title', ['Başlık']);
  if (titleField) {
    fields[titleField] = week.title;
  } else {
    throw new Error('Title alanı bulunamadı');
  }
  
  // Status - kontrol et
  const statusField = findField('Status', ['Durum']);
  if (statusField) {
    fields[statusField] = week.status;
  } else {
    console.warn('Status alanı bulunamadı, atlanıyor');
  }
  
  // StartDate - kontrol et
  const startDateField = findField('StartDate', ['Start_x0020_Date', 'Start Date']);
  if (startDateField) {
    fields[startDateField] = week.startDate;
  } else {
    console.warn('StartDate alanı bulunamadı, atlanıyor');
  }
  
  // EndDate - kontrol et
  const endDateField = findField('EndDate', ['End_x0020_Date', 'End Date']);
  if (endDateField) {
    fields[endDateField] = week.endDate;
  } else {
    console.warn('EndDate alanı bulunamadı, atlanıyor');
  }
  
  // Days - kontrol et
  const daysField = findField('Days', ['DaysJson']);
  if (daysField) {
    fields[daysField] = JSON.stringify(week.days);
  } else {
    console.warn('Days alanı bulunamadı, atlanıyor');
  }
  
  console.log('Saving week with fields:', {
    fieldMappings: {
      title: titleField,
      status: statusField,
      startDate: startDateField,
      endDate: endDateField,
      days: daysField
    },
    values: Object.keys(fields).reduce((acc: any, key) => {
      acc[key] = typeof fields[key] === 'string' && fields[key].length > 100 
        ? fields[key].substring(0, 100) + '...' 
        : fields[key];
      return acc;
    }, {})
  });
  
  return { fields };
};

// Ana Fonksiyonlar
export const getWeeks = async (): Promise<Week[]> => {
  try {
    const listId = await getListId();
    const siteId = await getSiteId();
    const schema = await getListSchema();
    
    // StartDate alanının mevcut olup olmadığını kontrol et
    const hasStartDate = schema?.columns?.some((c: any) => 
      c.displayName === 'StartDate' || c.name === 'StartDate' || c.name === 'Start_x0020_Date'
    );
    
    // Sıralama için StartDate varsa kullan, yoksa Title kullan
    const orderByField = hasStartDate ? 'fields/StartDate' : 'fields/Title';
    const orderDirection = hasStartDate ? 'desc' : 'desc';
    
    // GÖREV 2: API İsteğini Düzelt - Tüm alanları çekmek için $expand kullan
    const endpoint = `/sites/${siteId}/lists/${listId}/items?$expand=fields&$orderby=${orderByField} ${orderDirection}`;
    const response = await graphRequest(endpoint);
    
    // GÖREV 3: Ham API Yanıtını Logla
    console.log('🔥 HAM GRAPH API YANITI (getWeeks):', JSON.stringify(response, null, 2));
    if (response.value && response.value.length > 0) {
      console.log('🔥 İlk item fields:', JSON.stringify(response.value[0]?.fields || {}, null, 2));
      console.log('🔥 İlk item fields keys:', Object.keys(response.value[0]?.fields || {}));
    }

    if (!response.value) {
      console.warn('⚠️ getWeeks: response.value boş');
      return [];
    }

    const weeks = response.value.map((item: any) => mapListItemToWeek(item, schema));
    
    // Eğer StartDate ile sıralama yapamadıysak, manuel sırala
    if (!hasStartDate) {
      weeks.sort((a: Week, b: Week) => {
        const dateA = parseDate(a.startDate);
        const dateB = parseDate(b.startDate);
        const timeA = dateA ? dateA.getTime() : 0;
        const timeB = dateB ? dateB.getTime() : 0;
        return timeB - timeA;
      });
    }
    
    return weeks;
  } catch (error) {
    console.error('Haftalar getirilemedi:', error);
    throw error;
  }
};

export const getWeekById = async (id: string): Promise<Week | undefined> => {
  try {
    const listId = await getListId();
    const siteId = await getSiteId();
    const schema = await getListSchema();
    
    // GÖREV 2: API İsteğini Düzelt - Tüm alanları çekmek için $expand kullan
    const endpoint = `/sites/${siteId}/lists/${listId}/items/${id}?$expand=fields`;
    const response = await graphRequest(endpoint);
    
    // GÖREV 3: Ham API Yanıtını Logla
    console.log('🔥 HAM GRAPH API YANITI (getWeekById):', JSON.stringify(response, null, 2));
    console.log('🔥 Response fields:', JSON.stringify(response?.fields || {}, null, 2));
    console.log('🔥 Response fields keys:', Object.keys(response?.fields || {}));

    return mapListItemToWeek(response, schema);
  } catch (error) {
    console.error('Hafta getirilemedi:', error);
    return undefined;
  }
};

// Liste şemasını al ve alan isimlerini öğren
let cachedListSchema: any = null;
const getListSchema = async (): Promise<any> => {
  if (cachedListSchema) {
    return cachedListSchema;
  }
  
  try {
    const listId = await getListId();
    const siteId = await getSiteId();
    // Tüm sütun bilgilerini çek (text, dateTime, number, choice vb.)
    const list = await graphRequest(`/sites/${siteId}/lists/${listId}?$expand=columns($select=name,displayName,readOnly,required,text,dateTime,number,choice,columnGroup)`);
    cachedListSchema = list;
    
    // GÖREV 2: Gerçek Sütun İsimlerini Listele (Source of Truth) - Detaylı Analiz
    if (list?.columns && Array.isArray(list.columns)) {
      console.log('📋 ----------------------------------------------------');
      console.log('📋 SHAREPOINT LİSTE SÜTUN ANALİZİ (Internal Names)');
      console.log('📋 ----------------------------------------------------');
      
      const columnReport = list.columns.map((c: any) => ({
        'Görünen İsim (Display)': c.displayName || 'N/A',
        'Sistem İsmi (Internal - Kodda bunu kullan!)': c.name || 'N/A',
        'Türü': c.text ? 'Metin' : (c.dateTime ? 'Tarih' : (c.number ? 'Sayı' : (c.choice ? 'Seçim' : 'Diğer'))),
        'ReadOnly': c.readOnly ? 'Evet' : 'Hayır',
        'Required': c.required ? 'Evet' : 'Hayır'
      }));
      
      console.table(columnReport); // Tablo olarak basar, çok okunaklıdır
      console.log('📋 ----------------------------------------------------');
      
      // Ayrıca JSON formatında da logla (daha detaylı)
      console.log('📋 TÜM SÜTUN DETAYLARI (JSON):', JSON.stringify(list.columns, null, 2));
    }
    
    return list;
  } catch (error) {
    console.error('Liste şeması alınamadı:', error);
    return null;
  }
};

// Eksik alanları SharePoint listesine ekle - Sadece bir kez çalışır
let fieldsCheckDone = false;
const ensureRequiredFields = async (): Promise<void> => {
  // Sadece bir kez kontrol et - tekrar tekrar deneme yapma
  if (fieldsCheckDone) {
    return;
  }
  
  try {
    const schema = await getListSchema();
    
    if (!schema?.columns) {
      console.warn('Liste şeması alınamadı, alan kontrolü yapılamıyor');
      fieldsCheckDone = true; // Bir kez denedik, tekrar deneme
      return;
    }
    
    const existingFields = schema.columns.map((c: any) => c.name.toLowerCase());
    const fieldsToAdd: Array<{ displayName: string; name: string; type: string }> = [];
    
    // StartDate alanını kontrol et
    if (!existingFields.some((f: string) => f.includes('startdate') || f.includes('start_x0020_date'))) {
      fieldsToAdd.push({
        displayName: 'StartDate',
        name: 'StartDate',
        type: 'DateTime'
      });
    }
    
    // EndDate alanını kontrol et
    if (!existingFields.some((f: string) => f.includes('enddate') || f.includes('end_x0020_date'))) {
      fieldsToAdd.push({
        displayName: 'EndDate',
        name: 'EndDate',
        type: 'DateTime'
      });
    }
    
    // Days alanını kontrol et
    if (!existingFields.some((f: string) => f.includes('days'))) {
      fieldsToAdd.push({
        displayName: 'Days',
        name: 'Days',
        type: 'Note' // Çok satırlı metin (JSON için)
      });
    }
    
    // Eğer eklenmesi gereken alan yoksa, işaretle ve çık
    if (fieldsToAdd.length === 0) {
      fieldsCheckDone = true;
      return;
    }
    
    // GÖREV 1: Otomatik Sütun Oluşturmayı DEVRE DIŞI BIRAK
    // Eksik alanları ekleme işlemi devre dışı - sadece uyarı ver
    for (const field of fieldsToAdd) {
      console.warn(`⚠️ Sütun bulunamadı ancak otomatik oluşturma devre dışı: ${field.displayName} (${field.name})`);
      // Otomatik oluşturma kodu yorum satırına alındı:
      /*
      try {
        console.log(`Alan ekleniyor: ${field.displayName} (${field.type})`);
        
        let fieldDefinition: any;
        
        if (field.type === 'DateTime') {
          // Graph API DateTime alanı için doğru format
          fieldDefinition = {
            '@odata.type': '#microsoft.graph.dateTimeColumn',
            name: field.name,
            displayName: field.displayName,
            dateTime: {
              format: 'dateOnly'
            }
          };
        } else if (field.type === 'Note') {
          // Graph API Note (çok satırlı metin) için doğru format
          fieldDefinition = {
            '@odata.type': '#microsoft.graph.textColumn',
            name: field.name,
            displayName: field.displayName,
            text: {
              allowMultipleLines: true,
              maxLength: 10000
            }
          };
        } else {
          continue; // Bilinmeyen tip, atla
        }
        
        await graphRequest(
          `/sites/${siteId}/lists/${listId}/columns`,
          {
            method: 'POST',
            body: JSON.stringify(fieldDefinition),
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`✅ Alan başarıyla eklendi: ${field.displayName}`);
        
        // Cache'i temizle
        cachedListSchema = null;
      } catch (error: any) {
        console.error(`❌ Alan eklenirken hata (${field.displayName}):`, error);
        // Hata aldıysak, bir daha deneme - işaretle ve çık
        fieldsCheckDone = true;
        return;
      }
      */
    }
    
    // İşaretle ve çık
    fieldsCheckDone = true;
    if (fieldsToAdd.length > 0) {
      console.warn(`⚠️ ${fieldsToAdd.length} alan bulunamadı ancak otomatik oluşturma devre dışı. Lütfen SharePoint'te manuel olarak oluşturun.`);
    }
  } catch (error) {
    console.error('Alan kontrolü/ekleme hatası:', error);
    // Hata olsa bile bir daha deneme
    fieldsCheckDone = true;
  }
};

// Alan isimlerini eşleştir (display name'den internal name'e) - Şu an kullanılmıyor
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _getFieldName = (displayName: string, schema: any): string => {
  if (!schema?.columns) return displayName;
  
  const column = schema.columns.find((c: any) => 
    c.displayName === displayName || c.name === displayName
  );
  
  return column?.name || displayName;
};

export const saveWeek = async (week: Week): Promise<Week> => {
  try {
    // Önce eksik alanları kontrol et ve ekle
    await ensureRequiredFields();
    
    const listId = await getListId();
    const siteId = await getSiteId();
    
    // Liste şemasını al ve alan isimlerini kontrol et (cache temizlendi, yeniden al)
    const listSchema = await getListSchema();
    if (listSchema?.columns) {
      console.log('Liste alanları:', listSchema.columns.map((c: any) => ({ 
        name: c.name, 
        displayName: c.displayName,
        readOnly: c.readOnly,
        required: c.required
      })));
    }
    
    const listItem = await mapWeekToListItem(week);
    console.log('Saving week:', { 
      weekId: week.id, 
      fieldsToSave: Object.keys(listItem.fields),
      listItem 
    });
    
    // Gönderilecek alanları doğrula
    const invalidFields = Object.keys(listItem.fields).filter(field => {
      const exists = listSchema?.columns?.some((c: any) => c.name === field);
      return !exists;
    });
    
    if (invalidFields.length > 0) {
      throw new Error(`Geçersiz alan isimleri: ${invalidFields.join(', ')}. Mevcut alanlar: ${listSchema?.columns?.map((c: any) => c.name).join(', ')}`);
    }

    if (week.id && week.id.startsWith('week-')) {
      // Yeni hafta - POST
      console.log('Yeni hafta oluşturuluyor...');
      const response = await graphRequest(
        `/sites/${siteId}/lists/${listId}/items`,
        {
          method: 'POST',
          body: JSON.stringify(listItem)
        }
      );
      console.log('Hafta oluşturuldu:', response);
      // SharePoint'ten dönen ID ile güncelle
      return {
        ...week,
        id: response.id
      };
    } else {
      // Mevcut hafta - PATCH
      console.log('Mevcut hafta güncelleniyor...', week.id);
      await graphRequest(
        `/sites/${siteId}/lists/${listId}/items/${week.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(listItem)
        }
      );
      return week;
    }
  } catch (error: any) {
    console.error('Hafta kaydedilemedi:', error);
    const errorMessage = error?.message || 'Bilinmeyen hata';
    alert(`Hafta kaydedilemedi: ${errorMessage}\n\nLütfen konsolu kontrol edin.`);
    throw error;
  }
};

export const removeWeek = async (weekId: string): Promise<boolean> => {
  try {
    const listId = await getListId();
    const siteId = await getSiteId();
    
    await graphRequest(
      `/sites/${siteId}/lists/${listId}/items/${weekId}`,
      {
        method: 'DELETE'
      }
    );

    return true;
  } catch (error) {
    console.error('Hafta silinemedi:', error);
    return false;
  }
};

export const addDayToWeek = async (weekId: string, _afterDateString?: string): Promise<Day | null> => {
  try {
    // 1. HAFTAYI BUL
    const week = await getWeekById(weekId);
    if (!week) {
      console.error('❌ addDayToWeek: Hafta bulunamadı:', weekId);
      return null;
    }

    console.log('🔍 addDayToWeek - İşlem başlatıldı:', {
      weekId: week.id,
      weekTitle: week.title,
      weekStartDate: week.startDate,
      weekEndDate: week.endDate,
      existingDays: week.days.length,
      existingDayDates: week.days.map(d => d.date)
    });

    // 2. HAFTA TARİHLERİNİ KONTROL ET VE PARSE ET
    if (!week.startDate || week.startDate === '' || !week.endDate || week.endDate === '') {
      console.error('❌ addDayToWeek: Hafta tarihleri eksik:', {
        startDate: week.startDate,
        endDate: week.endDate
      });
      return null;
    }

    const weekStartDate = parseDate(week.startDate);
    const weekEndDate = parseDate(week.endDate);

    if (!weekStartDate || !weekEndDate) {
      console.error('❌ addDayToWeek: Hafta tarihleri parse edilemedi:', {
        startDate: week.startDate,
        endDate: week.endDate
      });
      return null;
    }

    console.log('✅ addDayToWeek - Hafta tarihleri parse edildi:', {
      weekStartDate: getDateString(weekStartDate),
      weekEndDate: getDateString(weekEndDate)
    });

    // 3. YENİ GÜN TARİHİNİ HESAPLA
    let nextDateStr: string;
    
    if (week.days.length === 0) {
      // İlk gün - haftanın başlangıç tarihini kullan
      nextDateStr = week.startDate;
      console.log('📅 addDayToWeek - İlk gün ekleniyor:', nextDateStr);
    } else {
      // Mevcut günler var - en son günün tarihinden +1 gün
      const lastDay = week.days[week.days.length - 1];
      const lastDate = parseDate(lastDay.date);
      
      if (!lastDate) {
        console.error('❌ addDayToWeek: Son günün tarihi geçersiz:', lastDay.date);
        return null;
      }

      // +1 gün ekle (UTC kullanarak timezone sorunlarını önle)
      const nextDate = new Date(lastDate);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      nextDateStr = getDateString(nextDate);
      
      console.log('📅 addDayToWeek - Sonraki gün hesaplandı:', {
        lastDayDate: lastDay.date,
        nextDayDate: nextDateStr
      });
    }

    // 4. SINIR KONTROLÜ - Hafta bitiş tarihini geçiyor mu?
    const nextDate = parseDate(nextDateStr);
    if (!nextDate) {
      console.error('❌ addDayToWeek: Hesaplanan tarih parse edilemedi:', nextDateStr);
      return null;
    }

    if (nextDate > weekEndDate) {
      console.warn('⚠️ addDayToWeek: Yeni tarih hafta bitiş tarihini geçiyor:', {
        nextDate: nextDateStr,
        weekEndDate: week.endDate,
        message: 'Haftanın sonuna gelindi!'
      });
      // KULLANICI İSTEĞİ: İşlemi durdur (kilitleme yerine uyarı)
      return null;
    }

    // 5. YENİ GÜNÜ OLUŞTUR
    const dayOfWeek = getDayOfWeek(nextDateStr);
    const newDay: Day = {
      id: `d${weekId}-${Date.now()}`,
      date: nextDateStr,
      dayOfWeek: dayOfWeek,
      videos: []
    };

    console.log('✨ addDayToWeek - Yeni gün oluşturuldu:', {
      id: newDay.id,
      date: newDay.date,
      dayOfWeek: newDay.dayOfWeek
    });

    // 6. GÜNÜ HAFTAYA EKLE VE KAYDET
    week.days.push(newDay);
    await saveWeek(week);
    
    console.log('✅ addDayToWeek: Gün başarıyla eklendi ve kaydedildi!');
    return newDay;
  } catch (error) {
    console.error('❌ Gün eklenemedi:', error);
    if (error instanceof Error) {
      console.error('Hata detayı:', error.message, error.stack);
    }
    return null;
  }
};

export const removeDayFromWeek = async (weekId: string, dayId: string): Promise<boolean> => {
  try {
    const week = await getWeekById(weekId);
    if (!week) return false;

    const index = week.days.findIndex(d => d.id === dayId);
    if (index === -1) return false;

    week.days.splice(index, 1);
    await saveWeek(week);
    return true;
  } catch (error) {
    console.error('Gün silinemedi:', error);
    return false;
  }
};

export const updateDayDate = async (weekId: string, dayId: string, newDateString: string): Promise<boolean> => {
  try {
    if (!newDateString) {
      console.error('updateDayDate: Boş tarih string');
      return false;
    }

    const week = await getWeekById(weekId);
    if (!week) {
      console.error('updateDayDate: Hafta bulunamadı:', weekId);
      return false;
    }

    const day = week.days.find(d => d.id === dayId);
    if (!day) {
      console.error('updateDayDate: Gün bulunamadı:', dayId);
      return false;
    }

    // Tarihleri güvenli şekilde parse et
    const newDate = parseDate(newDateString);
    const weekStart = parseDate(week.startDate);
    const weekEnd = parseDate(week.endDate);

    if (!newDate) {
      console.error('updateDayDate: Geçersiz yeni tarih:', newDateString);
      return false;
    }

    if (!weekStart || !weekEnd) {
      console.error('updateDayDate: Geçersiz hafta tarihleri:', {
        startDate: week.startDate,
        endDate: week.endDate
      });
      return false;
    }

    // Tarih hafta aralığında mı kontrol et
    if (newDate < weekStart || newDate > weekEnd) {
      console.warn('updateDayDate: Tarih hafta aralığı dışında:', {
        newDate: newDateString,
        weekStart: week.startDate,
        weekEnd: week.endDate
      });
      return false;
    }

    // Tarih string'ini güvenli şekilde oluştur
    const validatedDateString = getDateString(newDate);
    day.date = validatedDateString;
    day.dayOfWeek = getDayOfWeek(validatedDateString);

    // Günleri tarihe göre sırala
    week.days.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });

    await saveWeek(week);
    return true;
  } catch (error) {
    console.error('Gün tarihi güncellenemedi:', error);
    if (error instanceof Error) {
      console.error('Hata detayı:', error.message, error.stack);
    }
    return false;
  }
};

export const addVideoToDay = async (weekId: string, dayId: string, video: Omit<Video, 'id'>): Promise<Video | null> => {
  try {
    // Defensive Coding: Input validasyonu
    if (!weekId || !dayId) {
      console.error('addVideoToDay: Geçersiz parametreler:', { weekId, dayId });
      return null;
    }

    if (!video || (!video.url && video.url !== '')) {
      console.error('addVideoToDay: Geçersiz video objesi:', video);
      return null;
    }

    const week = await getWeekById(weekId);
    if (!week) {
      console.error('addVideoToDay: Hafta bulunamadı:', weekId);
      return null;
    }

    // Defensive Coding: days array kontrolü
    if (!week.days || !Array.isArray(week.days)) {
      console.error('addVideoToDay: Geçersiz days array:', week.days);
      week.days = [];
    }

    const day = week.days.find(d => d?.id === dayId);
    if (!day) {
      console.error('addVideoToDay: Gün bulunamadı:', { dayId, availableDays: week.days.map(d => d?.id) });
      return null;
    }

    // Defensive Coding: videos array kontrolü
    if (!day.videos || !Array.isArray(day.videos)) {
      console.warn('addVideoToDay: Geçersiz videos array, yeni array oluşturuluyor');
      day.videos = [];
    }

    // Defensive Coding: Video URL validasyonu
    const videoUrl = video.url?.trim() || '';
    if (!videoUrl) {
      console.error('addVideoToDay: Boş video URL');
      return null;
    }

    const newVideo: Video = {
      id: `v${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: videoUrl,
      type: video.type || 'story', // Varsayılan tip
      description: video.description?.trim() || undefined // Optional chaining ve null coalescing
    };

    day.videos.push(newVideo);
    await saveWeek(week);
    
    console.log('addVideoToDay: Video başarıyla eklendi:', { 
      videoId: newVideo.id, 
      type: newVideo.type,
      urlLength: newVideo.url.length 
    });
    
    return newVideo;
  } catch (error) {
    console.error('Video eklenemedi:', error);
    if (error instanceof Error) {
      console.error('Hata detayı:', error.message, error.stack);
    }
    return null;
  }
};

export const removeVideoFromDay = async (weekId: string, dayId: string, videoId: string): Promise<boolean> => {
  try {
    // Defensive Coding: Input validasyonu
    if (!weekId || !dayId || !videoId) {
      console.error('removeVideoFromDay: Geçersiz parametreler:', { weekId, dayId, videoId });
      return false;
    }

    const week = await getWeekById(weekId);
    if (!week) {
      console.error('removeVideoFromDay: Hafta bulunamadı:', weekId);
      return false;
    }

    // Defensive Coding: days array kontrolü
    if (!week.days || !Array.isArray(week.days)) {
      console.error('removeVideoFromDay: Geçersiz days array');
      return false;
    }

    const day = week.days.find(d => d?.id === dayId);
    if (!day) {
      console.error('removeVideoFromDay: Gün bulunamadı:', dayId);
      return false;
    }

    // Defensive Coding: videos array kontrolü
    if (!day.videos || !Array.isArray(day.videos)) {
      console.warn('removeVideoFromDay: Geçersiz videos array');
      return false;
    }

    const index = day.videos.findIndex(v => v?.id === videoId);
    if (index === -1) {
      console.warn('removeVideoFromDay: Video bulunamadı:', { videoId, availableVideos: day.videos.map(v => v?.id) });
      return false;
    }

    day.videos.splice(index, 1);
    await saveWeek(week);
    
    console.log('removeVideoFromDay: Video başarıyla silindi:', videoId);
    return true;
  } catch (error) {
    console.error('Video silinemedi:', error);
    if (error instanceof Error) {
      console.error('Hata detayı:', error.message, error.stack);
    }
    return false;
  }
};

export const updateVideoUrl = async (weekId: string, dayId: string, videoId: string, newUrl: string): Promise<boolean> => {
  try {
    // Defensive Coding: Input validasyonu
    if (!weekId || !dayId || !videoId) {
      console.error('updateVideoUrl: Geçersiz parametreler:', { weekId, dayId, videoId });
      return false;
    }

    const trimmedUrl = newUrl?.trim() || '';
    if (!trimmedUrl) {
      console.error('updateVideoUrl: Boş URL');
      return false;
    }

    const week = await getWeekById(weekId);
    if (!week) {
      console.error('updateVideoUrl: Hafta bulunamadı:', weekId);
      return false;
    }

    // Defensive Coding: Optional chaining
    const day = week.days?.find(d => d?.id === dayId);
    if (!day) {
      console.error('updateVideoUrl: Gün bulunamadı:', dayId);
      return false;
    }

    // Defensive Coding: videos array kontrolü
    if (!day.videos || !Array.isArray(day.videos)) {
      console.error('updateVideoUrl: Geçersiz videos array');
      return false;
    }

    const video = day.videos.find(v => v?.id === videoId);
    if (!video) {
      console.error('updateVideoUrl: Video bulunamadı:', videoId);
      return false;
    }

    video.url = trimmedUrl;
    await saveWeek(week);
    
    console.log('updateVideoUrl: Video URL başarıyla güncellendi:', { videoId, urlLength: trimmedUrl.length });
    return true;
  } catch (error) {
    console.error('Video URL güncellenemedi:', error);
    if (error instanceof Error) {
      console.error('Hata detayı:', error.message, error.stack);
    }
    return false;
  }
};

export const updateVideoDescription = async (weekId: string, dayId: string, videoId: string, description: string): Promise<boolean> => {
  try {
    // Defensive Coding: Input validasyonu
    if (!weekId || !dayId || !videoId) {
      console.error('updateVideoDescription: Geçersiz parametreler:', { weekId, dayId, videoId });
      return false;
    }

    // Defensive Coding: description null/undefined olabilir
    const trimmedDescription = description?.trim() || '';

    const week = await getWeekById(weekId);
    if (!week) {
      console.error('updateVideoDescription: Hafta bulunamadı:', weekId);
      return false;
    }

    // Defensive Coding: Optional chaining
    const day = week.days?.find(d => d?.id === dayId);
    if (!day) {
      console.error('updateVideoDescription: Gün bulunamadı:', dayId);
      return false;
    }

    // Defensive Coding: videos array kontrolü
    if (!day.videos || !Array.isArray(day.videos)) {
      console.error('updateVideoDescription: Geçersiz videos array');
      return false;
    }

    const video = day.videos.find(v => v?.id === videoId);
    if (!video) {
      console.error('updateVideoDescription: Video bulunamadı:', videoId);
      return false;
    }

    // Defensive Coding: Null coalescing - boş string yerine undefined
    video.description = trimmedDescription || undefined;
    await saveWeek(week);
    
    console.log('updateVideoDescription: Video açıklaması başarıyla güncellendi:', { 
      videoId, 
      descriptionLength: trimmedDescription.length 
    });
    return true;
  } catch (error) {
    console.error('Video açıklaması güncellenemedi:', error);
    if (error instanceof Error) {
      console.error('Hata detayı:', error.message, error.stack);
    }
    return false;
  }
};

const getWeekStartDate = (date: Date): Date => {
  const dayOfWeek = date.getUTCDay();
  const monday = new Date(date);
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  monday.setUTCDate(monday.getUTCDate() - daysToSubtract);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
};

const getWeekEndDate = (startDate: Date): Date => {
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  return endDate;
};

export const createWeek = async (startDate?: string): Promise<Week> => {
  try {
    // Mevcut haftaları al
    const existingWeeks = await getWeeks();
    
    let weekStart: Date;
    
    if (startDate) {
      const inputDate = parseDate(startDate);
      if (!inputDate) {
        throw new Error(`Geçersiz başlangıç tarihi: ${startDate}`);
      }
      weekStart = getWeekStartDate(inputDate);
    } else {
      const lastWeek = existingWeeks.length > 0 
        ? existingWeeks.reduce((latest, week) => {
            const latestDate = parseDate(latest.endDate);
            const weekDate = parseDate(week.endDate);
            if (!latestDate || !weekDate) return latest;
            return weekDate > latestDate ? week : latest;
          })
        : null;
      
      if (lastWeek) {
        const lastEndDate = parseDate(lastWeek.endDate);
        if (!lastEndDate) {
          throw new Error(`Geçersiz son hafta bitiş tarihi: ${lastWeek.endDate}`);
        }
        weekStart = new Date(lastEndDate);
        weekStart.setUTCDate(weekStart.getUTCDate() + 1);
        weekStart = getWeekStartDate(weekStart);
      } else {
        const today = new Date();
        weekStart = getWeekStartDate(today);
      }
    }

    if (!weekStart || isNaN(weekStart.getTime())) {
      throw new Error('Geçersiz hafta başlangıç tarihi oluşturuldu');
    }

    const weekEnd = getWeekEndDate(weekStart);
    if (!weekEnd || isNaN(weekEnd.getTime())) {
      throw new Error('Geçersiz hafta bitiş tarihi oluşturuldu');
    }

    const startDateString = getDateString(weekStart);
    const endDateString = getDateString(weekEnd);
    
    let weekNumber = 1;
    if (existingWeeks.length > 0) {
      const weekNumbers = existingWeeks.map(w => {
        const match = w.title.match(/^(\d+)\./);
        return match ? parseInt(match[1], 10) : 0;
      });
      weekNumber = Math.max(...weekNumbers, 0) + 1;
    }
    
    const startMonth = weekStart.toLocaleDateString('tr-TR', { month: 'long', day: 'numeric' });
    const endMonth = weekEnd.toLocaleDateString('tr-TR', { month: 'long', day: 'numeric' });

    const newWeek: Week = {
      id: `week-${Date.now()}`,
      title: `${weekNumber}. Hafta - ${startMonth} - ${endMonth}`,
      startDate: startDateString,
      endDate: endDateString,
      status: 'draft',
      days: []
    };

    const savedWeek = await saveWeek(newWeek);
    return savedWeek;
  } catch (error) {
    console.error('Hafta oluşturulamadı:', error);
    throw error;
  }
};

export const ensureNextWeekExists = async (): Promise<Week | null> => {
  try {
    const existingWeeks = await getWeeks();
    
    // Geçerli tarihleri olan haftaları filtrele
    const validWeeks = existingWeeks.filter(week => {
      const hasValidDates = week.startDate && week.startDate !== '' && 
                           week.endDate && week.endDate !== '';
      if (!hasValidDates) {
        console.warn('ensureNextWeekExists: Tarihleri eksik hafta atlandı:', {
          id: week.id,
          title: week.title,
          startDate: week.startDate,
          endDate: week.endDate
        });
      }
      return hasValidDates;
    });
    
    const lastWeek = validWeeks.length > 0 
      ? validWeeks.reduce((latest, week) => {
          const latestDate = parseDate(latest.endDate);
          const weekDate = parseDate(week.endDate);
          if (!latestDate || !weekDate) return latest;
          return weekDate > latestDate ? week : latest;
        })
      : null;

    if (!lastWeek) {
      console.log('ensureNextWeekExists: Geçerli hafta bulunamadı, yeni hafta oluşturuluyor');
      return await createWeek();
    }

    const lastEndDate = parseDate(lastWeek.endDate);
    if (!lastEndDate) {
      console.error('ensureNextWeekExists: Geçersiz son hafta bitiş tarihi (parse edilemedi):', lastWeek.endDate);
      return null;
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    const checkDate = new Date(lastEndDate);
    checkDate.setUTCDate(checkDate.getUTCDate() - 3);

    if (today >= checkDate) {
      let nextMonday = new Date(lastEndDate);
      nextMonday.setUTCDate(nextMonday.getUTCDate() + 1);
      nextMonday = getWeekStartDate(nextMonday);
      
      if (!nextMonday || isNaN(nextMonday.getTime())) {
        console.error('ensureNextWeekExists: Geçersiz nextMonday oluşturuldu');
        return null;
      }

      const nextMondayString = getDateString(nextMonday);
      const existingWeek = existingWeeks.find(w => w.startDate === nextMondayString);
      if (!existingWeek) {
        return await createWeek(nextMondayString);
      }
    }

    return null;
  } catch (error) {
    console.error('Otomatik hafta oluşturma hatası:', error);
    if (error instanceof Error) {
      console.error('Hata detayı:', error.message, error.stack);
    }
    return null;
  }
};

// ADIM 1: Klasör Garantisi - Klasör kontrolü ve oluşturma (GARANTİLİ MOD)
const ensureFolderExists = async (folderPath: string): Promise<void> => {
  const driveId = await getDriveId();
  const siteId = await getSiteId();
  
  console.log(`🔍 Klasör kontrol ediliyor: ${folderPath}`);
  
  // Klasörün var olup olmadığını kontrol et
  let folderExists = false;
  try {
    const folderCheck = await graphRequest(`/sites/${siteId}/drives/${driveId}/root:/${folderPath}:`);
    if (folderCheck && (folderCheck.folder || folderCheck['@microsoft.graph.downloadUrl'])) {
      folderExists = true;
      console.log(`✅ Klasör zaten mevcut: ${folderPath}`);
    }
  } catch (error: any) {
    // 404 hatası = klasör yok
    const is404 = error?.status === 404 || 
                  error?.message?.includes('404') || 
                  error?.message?.includes('ItemNotFound') ||
                  (error?.error?.code && (error.error.code.includes('itemNotFound') || error.error.code.includes('notFound')));
    
    if (!is404) {
      // 404 dışında bir hata - logla ve fırlat
      console.error(`❌ Klasör kontrolü hatası:`, error);
      throw new Error(`Klasör kontrolü başarısız: ${error?.message || 'Bilinmeyen hata'}`);
    }
  }
  
  // Klasör yoksa oluştur
  if (!folderExists) {
    console.log(`📁 Klasör bulunamadı, oluşturuluyor: ${folderPath}`);
    
    try {
      // Klasör oluştur - SharePoint'te klasör oluşturma için doğru endpoint
      const createResponse = await graphRequest(
        `/sites/${siteId}/drives/${driveId}/root/children`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: folderPath,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'rename'
          })
        }
      );
      
      // Klasör oluşturulduktan sonra tekrar kontrol et
      if (createResponse && createResponse.id) {
        console.log(`✅ Klasör başarıyla oluşturuldu: ${folderPath} (ID: ${createResponse.id})`);
        
        // Doğrulama: Klasörün gerçekten oluştuğunu kontrol et
        try {
          const verifyCheck = await graphRequest(`/sites/${siteId}/drives/${driveId}/root:/${folderPath}:`);
          if (verifyCheck && (verifyCheck.folder || verifyCheck.id)) {
            console.log(`✅ Klasör doğrulandı: ${folderPath}`);
          } else {
            throw new Error('Klasör oluşturuldu ancak doğrulanamadı');
          }
        } catch (verifyError: any) {
          console.warn(`⚠️ Klasör doğrulama hatası (devam ediliyor):`, verifyError);
          // Doğrulama hatası olsa bile devam et - belki klasör oluştu
        }
      } else {
        throw new Error('Klasör oluşturma yanıtı geçersiz');
      }
    } catch (createError: any) {
      // Klasör oluşturma hatası - kritik hata, fırlat
      console.error(`❌ Klasör oluşturma hatası:`, createError);
      
      // Eğer "zaten var" hatası ise, devam et
      const isConflict = createError?.status === 409 || 
                         createError?.message?.includes('already exists') ||
                         createError?.message?.includes('Conflict') ||
                         (createError?.error?.code && createError.error.code.includes('nameAlreadyExists'));
      
      if (isConflict) {
        console.log(`ℹ️ Klasör zaten mevcut (çakışma): ${folderPath}`);
        // Çakışma = klasör zaten var, devam et
        return;
      }
      
      // Diğer hatalar için fırlat
      throw new Error(`Klasör oluşturulamadı: ${createError?.message || 'Bilinmeyen hata'}`);
    }
  }
};

// Video Yükleme - Large File Upload API
export const uploadVideo = async (file: File | null | undefined): Promise<string> => {
  try {
    // Defensive Coding: File validasyonu
    if (!file) {
      throw new Error('Dosya seçilmedi');
    }

    if (!(file instanceof File)) {
      throw new Error('Geçersiz dosya tipi');
    }

    // Defensive Coding: Dosya boyutu kontrolü (opsiyonel - 500MB limit)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      throw new Error(`Dosya boyutu çok büyük. Maksimum: ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
    }

    if (file.size === 0) {
      throw new Error('Dosya boş');
    }

    // Defensive Coding: Dosya tipi kontrolü
    if (!file.type.startsWith('video/')) {
      console.warn('uploadVideo: Dosya tipi video değil:', file.type);
      // Yine de devam et, bazı tarayıcılar type'ı yanlış gösterebilir
    }

    const driveId = await getDriveId();
    const siteId = await getSiteId();
    
    // ADIM 1: Klasör garantisi - Klasör kontrolü ve oluşturma (GARANTİLİ MOD)
    console.log('🔒 ADIM 1: Klasör garantisi başlatılıyor...');
    await ensureFolderExists('videos');
    console.log('✅ ADIM 1: Klasör garantisi tamamlandı');
    
    // ADIM 2: Benzersiz dosya adı - Timestamp + Random + Temizlenmiş dosya adı
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8); // 6 karakterlik random string
    const uniqueFileName = `${timestamp}_${randomSuffix}_${sanitizedFileName}`;
    const fileName = `videos/${uniqueFileName}`;
    
    console.log('📤 ADIM 2: Video yükleme başlatılıyor:', fileName);
    console.log('🔐 Benzersiz dosya adı (çakışma önleme):', uniqueFileName);
    
    // ADIM 3: Upload session oluştur - conflictBehavior: 'rename' kullan (çakışma önleme)
    // Microsoft Graph API dokümantasyonuna göre, createUploadSession için payload formatı:
    // { "@microsoft.graph.conflictBehavior": "rename", "name": "..." }
    // veya
    // { "item": { "@microsoft.graph.conflictBehavior": "rename", "name": "..." } }
    // Her iki format da desteklenir, ancak direkt format daha yaygın kullanılır.
    console.log('🔧 ADIM 3: Upload session oluşturuluyor...', {
      fileName: uniqueFileName,
      fullPath: fileName,
      conflictBehavior: 'rename',
      driveId: driveId.substring(0, 20) + '...',
      siteId: siteId.substring(0, 20) + '...'
    });
    
    // Upload session oluştur - direkt format kullan
    const uploadSessionResponse = await graphRequest(
      `/sites/${siteId}/drives/${driveId}/root:/${fileName}:/createUploadSession`,
      {
        method: 'POST',
        body: JSON.stringify({
          '@microsoft.graph.conflictBehavior': 'rename', // 'replace' yerine 'rename' - çakışma önleme
          name: uniqueFileName // Benzersiz dosya adı ile çakışma riski minimize edildi
        })
      }
    );

    // Upload session yanıtını kontrol et
    if (!uploadSessionResponse || !uploadSessionResponse.uploadUrl) {
      console.error('❌ Upload session oluşturma hatası - Yanıt:', uploadSessionResponse);
      
      // Klasörün varlığını tekrar kontrol et
      try {
        const folderRecheck = await graphRequest(`/sites/${siteId}/drives/${driveId}/root:/videos:`);
        console.log('ℹ️ Klasör kontrolü (upload session hatası sonrası):', folderRecheck ? 'Mevcut' : 'Bulunamadı');
      } catch (recheckError) {
        console.error('❌ Klasör kontrolü hatası (upload session hatası sonrası):', recheckError);
      }
      
      throw new Error('Upload session oluşturulamadı - uploadUrl bulunamadı. Klasör kontrolü yapıldı.');
    }
    
    const uploadUrl = uploadSessionResponse.uploadUrl;
    console.log('✅ ADIM 3: Upload session başarıyla oluşturuldu:', uploadUrl.substring(0, 100) + '...');

    // 2. Dosyayı parça parça yükle (4MB chunk size)
    const chunkSize = 4 * 1024 * 1024; // 4MB
    const fileSize = file.size;
    let uploadedBytes = 0;
    let lastResponse: Response | null = null;

    while (uploadedBytes < fileSize) {
      const chunk = file.slice(uploadedBytes, uploadedBytes + chunkSize);
      const chunkEnd = Math.min(uploadedBytes + chunkSize - 1, fileSize - 1);
      
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': (chunkEnd - uploadedBytes + 1).toString(),
          'Content-Range': `bytes ${uploadedBytes}-${chunkEnd}/${fileSize}`
        },
        body: chunk
      });

      if (!response.ok && response.status !== 201 && response.status !== 200 && response.status !== 202) {
        const errorText = await response.text();
        throw new Error(`Upload hatası: ${response.status} - ${errorText}`);
      }

      lastResponse = response;
      uploadedBytes = chunkEnd + 1;
    }

    // SORUN 3 ÇÖZÜMÜ: Yükleme tamamlandıktan sonra dosya bilgilerini al - webUrl kullan
    console.log('✅ Video yükleme tamamlandı, dosya bilgileri alınıyor...');
    
    // Alternatif: Dosya bilgilerini Graph API'den al (en güvenilir yöntem)
    const fileInfo = await graphRequest(
      `/sites/${siteId}/drives/${driveId}/root:/${fileName}`
    );

    console.log('📄 Dosya bilgileri:', {
      webUrl: fileInfo.webUrl,
      downloadUrl: fileInfo['@microsoft.graph.downloadUrl'],
      name: fileInfo.name
    });

    // SORUN 3 ÇÖZÜMÜ: webUrl kullan (paylaşılabilir link)
    if (fileInfo.webUrl) {
      console.log('✅ Video URL alındı (webUrl):', fileInfo.webUrl);
      return fileInfo.webUrl;
    }

    // Fallback 1: Son response'tan dosya bilgilerini almayı dene
    if (lastResponse) {
      try {
        const fileData = await lastResponse.json();
        if (fileData.webUrl) {
          console.log('✅ Video URL alındı (lastResponse):', fileData.webUrl);
          return fileData.webUrl;
        }
      } catch (e) {
        // JSON parse hatası, devam et
        console.warn('⚠️ lastResponse JSON parse hatası:', e);
      }
    }

    // Fallback 2: download URL (son çare - geçici link)
    if (fileInfo['@microsoft.graph.downloadUrl']) {
      console.warn('⚠️ webUrl bulunamadı, downloadUrl kullanılıyor (geçici link)');
      return fileInfo['@microsoft.graph.downloadUrl'];
    }

    throw new Error('Video URL alınamadı - webUrl ve downloadUrl bulunamadı');
  } catch (error: any) {
    console.error('❌ Video yükleme hatası:', error);
    
    // Kullanıcı dostu hata mesajları
    if (error?.status === 403 || error?.message?.includes('403') || error?.message?.includes('Forbidden')) {
      const friendlyMessage = 'Video yükleme izni reddedildi. Klasör oluşturma veya dosya yazma yetkisi eksik olabilir.';
      console.error('🔒 403 Forbidden - Detay:', error);
      throw new Error(friendlyMessage);
    }
    
    if (error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('ItemNotFound')) {
      const friendlyMessage = 'Klasör bulunamadı. Klasör oluşturma işlemi başarısız olmuş olabilir.';
      console.error('📁 404 Not Found - Detay:', error);
      throw new Error(friendlyMessage);
    }
    
    if (error?.message?.includes('Request was cancelled by event received') || 
        error?.message?.includes('event received')) {
      const friendlyMessage = 'Dosya yükleme işlemi SharePoint tarafından iptal edildi. Klasör eksikliği veya dosya çakışması olabilir.';
      console.error('🚫 Event Received - Detay:', error);
      throw new Error(friendlyMessage);
    }
    
    // Genel hata mesajı
    const errorMessage = error?.message || 'Bilinmeyen hata';
    throw new Error(`Video yükleme başarısız: ${errorMessage}`);
  }
};

// SharePoint'ten dosya içeriğini Blob olarak getir (kimlik doğrulamalı)
// Bu fonksiyon, SharePoint URL'lerini doğrudan video src'de kullanmak yerine
// kimlik doğrulamalı blob URL oluşturmak için kullanılır
export const getFileContentAsBlob = async (fileName: string): Promise<Blob> => {
  try {
    // Defensive Coding: Dosya adı validasyonu
    if (!fileName || typeof fileName !== 'string' || fileName.trim() === '') {
      throw new Error('Geçersiz dosya adı');
    }

    const siteId = await getSiteId();
    const driveId = await getDriveId();
    
    // Dosya adını temizle (path'ten sadece dosya adını al)
    // Örnek: "videos/1768377426498_wnll26_Cuma.mp4" -> "1768377426498_wnll26_Cuma.mp4"
    const cleanFileName = fileName.includes('/') 
      ? fileName.split('/').pop() || fileName 
      : fileName;
    
    const filePath = `videos/${cleanFileName}`;
    
    console.log('📥 Dosya içeriği blob olarak getiriliyor:', filePath);
    
    // Graph API'den dosya içeriğini blob olarak al
    const token = await getAccessToken();
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${filePath}:/content`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Prefer': 'HonorNonIndexedQueriesWarningMayFailRandomly'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Dosya içeriği alınamadı:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        filePath
      });
      throw new Error(`Dosya içeriği alınamadı: ${response.status} - ${errorText}`);
    }

    // Response'u blob olarak al
    const blob = await response.blob();
    console.log('✅ Dosya blob olarak alındı:', {
      fileName: cleanFileName,
      blobSize: blob.size,
      blobType: blob.type
    });
    
    return blob;
  } catch (error) {
    console.error('❌ getFileContentAsBlob hatası:', error);
    throw error;
  }
};
