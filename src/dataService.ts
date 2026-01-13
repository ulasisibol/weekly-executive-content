import { Providers } from '@microsoft/mgt-element';
import { Week, Day, Video } from './types';

// SharePoint Site ve Liste Bilgileri
const SHAREPOINT_SITE_URL = 'https://pakyurektarim1.sharepoint.com/sites/mezzeMarinMarkaletiimi';
const LIST_NAME = 'HaftalikIcerik';
const DOCUMENT_LIBRARY_NAME = 'Documents'; // Shared Documents

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

  const account = await provider.getAccount();
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
    cachedSiteId = siteData.id;
    return cachedSiteId;
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
    
    if (!foundList) {
      throw new Error(`Liste bulunamadı: ${LIST_NAME}. Mevcut listeler: ${lists.value?.map((l: any) => l.displayName || l.name).join(', ') || 'yok'}`);
    }

    cachedListId = foundList.id;
    console.log('List ID bulundu:', cachedListId);
    return cachedListId;
  } catch (error) {
    console.error('List ID bulunamadı:', error);
    throw error;
  }
};

// Drive ID'yi bul (Documents kütüphanesi için)
const getDriveId = async (): Promise<string> => {
  if (cachedDriveId) {
    return cachedDriveId;
  }

  try {
    const siteId = await getSiteId();
    const drives = await graphRequest(`/sites/${siteId}/drives?$filter=name eq '${DOCUMENT_LIBRARY_NAME}'`);
    
    if (!drives.value || drives.value.length === 0) {
      throw new Error(`Drive bulunamadı: ${DOCUMENT_LIBRARY_NAME}`);
    }

    cachedDriveId = drives.value[0].id;
    return cachedDriveId;
  } catch (error) {
    console.error('Drive ID bulunamadı:', error);
    throw error;
  }
};

// Yardımcı Fonksiyonlar
const getDateString = (date: Date): string => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

const getDayOfWeek = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00Z');
  return dayNames[date.getUTCDay()];
};

// SharePoint List Item'ı Week tipine dönüştür
const mapListItemToWeek = (item: any, schema?: any): Week => {
  const fields = item.fields || {};
  
  console.log('Mapping list item:', { 
    id: item.id, 
    fieldKeys: Object.keys(fields),
    sampleFields: Object.keys(fields).slice(0, 10).reduce((acc: any, key) => {
      acc[key] = typeof fields[key] === 'string' ? fields[key].substring(0, 50) : fields[key];
      return acc;
    }, {})
  });
  
  // Schema varsa alan isimlerini eşleştir
  let titleField = 'Title';
  let startDateField = 'StartDate';
  let endDateField = 'EndDate';
  let statusField = 'Status';
  let daysField = 'Days';
  
  if (schema?.columns) {
    const findField = (displayName: string) => {
      const col = schema.columns.find((c: any) => 
        c.displayName === displayName || c.name === displayName
      );
      return col?.name || displayName;
    };
    
    titleField = findField('Title');
    startDateField = findField('StartDate');
    endDateField = findField('EndDate');
    statusField = findField('Status');
    daysField = findField('Days');
  }
  
  // JSON alanlarını parse et
  let days: Day[] = [];
  try {
    const daysValue = fields[daysField] || fields.Days || fields.days || fields.DaysJson || fields.daysJson;
    if (daysValue) {
      days = typeof daysValue === 'string' ? JSON.parse(daysValue) : daysValue;
    }
  } catch (e) {
    console.error('Days parse hatası:', e, { daysField, value: fields[daysField] });
    days = [];
  }

  // Alan değerlerini al
  const title = fields[titleField] || fields.Title || fields.title || `Hafta ${item.id}`;
  const startDate = fields[startDateField] || fields.StartDate || fields.startDate || fields.StartDate0 || '';
  const endDate = fields[endDateField] || fields.EndDate || fields.endDate || fields.EndDate0 || '';
  const statusValue = fields[statusField] || fields.Status || fields.status;
  const status = (statusValue === 'published' || statusValue === 'draft') 
                  ? statusValue : 'draft';

  return {
    id: item.id,
    title,
    startDate,
    endDate,
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
    
    const response = await graphRequest(
      `/sites/${siteId}/lists/${listId}/items?$expand=fields&$orderby=${orderByField} ${orderDirection}`
    );

    if (!response.value) {
      return [];
    }

    const weeks = response.value.map((item: any) => mapListItemToWeek(item, schema));
    
    // Eğer StartDate ile sıralama yapamadıysak, manuel sırala
    if (!hasStartDate) {
      weeks.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA;
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
    
    const response = await graphRequest(
      `/sites/${siteId}/lists/${listId}/items/${id}?$expand=fields`
    );

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
    const list = await graphRequest(`/sites/${siteId}/lists/${listId}?$expand=columns($select=name,displayName,readOnly,required,text,dateTime)`);
    cachedListSchema = list;
    return list;
  } catch (error) {
    console.error('Liste şeması alınamadı:', error);
    return null;
  }
};

// Eksik alanları SharePoint listesine ekle
const ensureRequiredFields = async (): Promise<void> => {
  try {
    const listId = await getListId();
    const siteId = await getSiteId();
    const schema = await getListSchema();
    
    if (!schema?.columns) {
      console.warn('Liste şeması alınamadı, alan kontrolü yapılamıyor');
      return;
    }
    
    const existingFields = schema.columns.map((c: any) => c.name.toLowerCase());
    const fieldsToAdd: Array<{ displayName: string; name: string; type: string }> = [];
    
    // StartDate alanını kontrol et
    if (!existingFields.some(f => f.includes('startdate') || f.includes('start_x0020_date'))) {
      fieldsToAdd.push({
        displayName: 'StartDate',
        name: 'StartDate',
        type: 'DateTime'
      });
    }
    
    // EndDate alanını kontrol et
    if (!existingFields.some(f => f.includes('enddate') || f.includes('end_x0020_date'))) {
      fieldsToAdd.push({
        displayName: 'EndDate',
        name: 'EndDate',
        type: 'DateTime'
      });
    }
    
    // Days alanını kontrol et
    if (!existingFields.some(f => f.includes('days'))) {
      fieldsToAdd.push({
        displayName: 'Days',
        name: 'Days',
        type: 'Note' // Çok satırlı metin (JSON için)
      });
    }
    
    // Eksik alanları ekle
    for (const field of fieldsToAdd) {
      try {
        console.log(`Alan ekleniyor: ${field.displayName} (${field.type})`);
        
        let fieldDefinition: any;
        
        if (field.type === 'DateTime') {
          fieldDefinition = {
            '@odata.type': '#microsoft.graph.dateTimeColumn',
            name: field.name,
            displayName: field.displayName,
            dateTime: {
              format: 'dateOnly'
            }
          };
        } else if (field.type === 'Note') {
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
            body: JSON.stringify(fieldDefinition)
          }
        );
        
        console.log(`Alan eklendi: ${field.displayName}`);
        
        // Cache'i temizle
        cachedListSchema = null;
      } catch (error: any) {
        console.error(`Alan eklenirken hata (${field.displayName}):`, error);
        // Devam et, diğer alanları eklemeyi dene
      }
    }
    
    if (fieldsToAdd.length > 0) {
      console.log(`${fieldsToAdd.length} alan ekleme işlemi tamamlandı`);
    }
  } catch (error) {
    console.error('Alan kontrolü/ekleme hatası:', error);
    // Hata olsa bile devam et
  }
};

// Alan isimlerini eşleştir (display name'den internal name'e)
const getFieldName = (displayName: string, schema: any): string => {
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

export const addDayToWeek = async (weekId: string, afterDateString: string): Promise<Day | null> => {
  try {
    const week = await getWeekById(weekId);
    if (!week) return null;

    let nextDate: Date;
    
    if (week.days.length === 0) {
      nextDate = new Date(week.startDate + 'T00:00:00Z');
    } else {
      const existingDates = week.days.map(d => new Date(d.date + 'T00:00:00Z').getTime()).sort((a, b) => b - a);
      const lastDate = new Date(existingDates[0]);
      nextDate = new Date(lastDate);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    }

    const newDateString = getDateString(nextDate);

    if (new Date(newDateString + 'T00:00:00Z') > new Date(week.endDate + 'T00:00:00Z')) {
      return null;
    }

    const newDay: Day = {
      id: `d${weekId}-${Date.now()}`,
      date: newDateString,
      dayOfWeek: getDayOfWeek(newDateString),
      videos: []
    };

    const insertIndex = week.days.findIndex(d => new Date(d.date + 'T00:00:00Z').getTime() > new Date(newDateString + 'T00:00:00Z').getTime());
    if (insertIndex === -1) {
      week.days.push(newDay);
    } else {
      week.days.splice(insertIndex, 0, newDay);
    }

    await saveWeek(week);
    return newDay;
  } catch (error) {
    console.error('Gün eklenemedi:', error);
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
    const week = await getWeekById(weekId);
    if (!week) return false;

    const day = week.days.find(d => d.id === dayId);
    if (!day) return false;

    const newDate = new Date(newDateString + 'T00:00:00Z');
    const weekStart = new Date(week.startDate + 'T00:00:00Z');
    const weekEnd = new Date(week.endDate + 'T00:00:00Z');

    if (newDate < weekStart || newDate > weekEnd) {
      return false;
    }

    day.date = newDateString;
    day.dayOfWeek = getDayOfWeek(newDateString);

    week.days.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    await saveWeek(week);
    return true;
  } catch (error) {
    console.error('Gün tarihi güncellenemedi:', error);
    return false;
  }
};

export const addVideoToDay = async (weekId: string, dayId: string, video: Omit<Video, 'id'>): Promise<Video | null> => {
  try {
    const week = await getWeekById(weekId);
    if (!week) return null;

    const day = week.days.find(d => d.id === dayId);
    if (!day) return null;

    const newVideo: Video = {
      ...video,
      id: `v${Date.now()}`
    };

    day.videos.push(newVideo);
    await saveWeek(week);
    return newVideo;
  } catch (error) {
    console.error('Video eklenemedi:', error);
    return null;
  }
};

export const removeVideoFromDay = async (weekId: string, dayId: string, videoId: string): Promise<boolean> => {
  try {
    const week = await getWeekById(weekId);
    if (!week) return false;

    const day = week.days.find(d => d.id === dayId);
    if (!day) return false;

    const index = day.videos.findIndex(v => v.id === videoId);
    if (index === -1) return false;

    day.videos.splice(index, 1);
    await saveWeek(week);
    return true;
  } catch (error) {
    console.error('Video silinemedi:', error);
    return false;
  }
};

export const updateVideoUrl = async (weekId: string, dayId: string, videoId: string, newUrl: string): Promise<boolean> => {
  try {
    const week = await getWeekById(weekId);
    if (!week) return false;

    const day = week.days.find(d => d.id === dayId);
    if (!day) return false;

    const video = day.videos.find(v => v.id === videoId);
    if (!video) return false;

    video.url = newUrl;
    await saveWeek(week);
    return true;
  } catch (error) {
    console.error('Video URL güncellenemedi:', error);
    return false;
  }
};

export const updateVideoDescription = async (weekId: string, dayId: string, videoId: string, description: string): Promise<boolean> => {
  try {
    const week = await getWeekById(weekId);
    if (!week) return false;

    const day = week.days.find(d => d.id === dayId);
    if (!day) return false;

    const video = day.videos.find(v => v.id === videoId);
    if (!video) return false;

    video.description = description;
    await saveWeek(week);
    return true;
  } catch (error) {
    console.error('Video açıklaması güncellenemedi:', error);
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
      const inputDate = new Date(startDate + 'T00:00:00Z');
      weekStart = getWeekStartDate(inputDate);
    } else {
      const lastWeek = existingWeeks.length > 0 
        ? existingWeeks.reduce((latest, week) => {
            const latestDate = new Date(latest.endDate + 'T00:00:00Z');
            const weekDate = new Date(week.endDate + 'T00:00:00Z');
            return weekDate > latestDate ? week : latest;
          })
        : null;
      
      if (lastWeek) {
        const lastEndDate = new Date(lastWeek.endDate + 'T00:00:00Z');
        weekStart = new Date(lastEndDate);
        weekStart.setUTCDate(weekStart.getUTCDate() + 1);
        weekStart = getWeekStartDate(weekStart);
      } else {
        const today = new Date();
        weekStart = getWeekStartDate(today);
      }
    }

    const weekEnd = getWeekEndDate(weekStart);
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
    const lastWeek = existingWeeks.length > 0 
      ? existingWeeks.reduce((latest, week) => {
          const latestDate = new Date(latest.endDate + 'T00:00:00Z');
          const weekDate = new Date(week.endDate + 'T00:00:00Z');
          return weekDate > latestDate ? week : latest;
        })
      : null;

    if (!lastWeek) {
      return await createWeek();
    }

    const lastEndDate = new Date(lastWeek.endDate + 'T00:00:00Z');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    const checkDate = new Date(lastEndDate);
    checkDate.setUTCDate(checkDate.getUTCDate() - 3);

    if (today >= checkDate) {
      let nextMonday = new Date(lastEndDate);
      nextMonday.setUTCDate(nextMonday.getUTCDate() + 1);
      nextMonday = getWeekStartDate(nextMonday);
      
      const nextMondayString = getDateString(nextMonday);
      const existingWeek = existingWeeks.find(w => w.startDate === nextMondayString);
      if (!existingWeek) {
        return await createWeek(nextMondayString);
      }
    }

    return null;
  } catch (error) {
    console.error('Otomatik hafta oluşturma hatası:', error);
    return null;
  }
};

// Video Yükleme - Large File Upload API
export const uploadVideo = async (file: File): Promise<string> => {
  try {
    const driveId = await getDriveId();
    const siteId = await getSiteId();
    const fileName = `videos/${Date.now()}-${file.name}`;
    
    // 1. Upload session oluştur
    const uploadSessionResponse = await graphRequest(
      `/sites/${siteId}/drives/${driveId}/root:/${fileName}:/createUploadSession`,
      {
        method: 'POST',
        body: JSON.stringify({
          '@microsoft.graph.conflictBehavior': 'replace',
          name: file.name
        })
      }
    );

    const uploadUrl = uploadSessionResponse.uploadUrl;
    if (!uploadUrl) {
      throw new Error('Upload session oluşturulamadı');
    }

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

    // 3. Yükleme tamamlandıktan sonra dosya bilgilerini al
    // Son response'tan dosya bilgilerini almayı dene
    if (lastResponse) {
      try {
        const fileData = await lastResponse.json();
        if (fileData.webUrl) {
          return fileData.webUrl;
        }
      } catch (e) {
        // JSON parse hatası, devam et
      }
    }

    // Alternatif: Dosya bilgilerini Graph API'den al
    const fileInfo = await graphRequest(
      `/sites/${siteId}/drives/${driveId}/root:/${fileName}`
    );

    if (fileInfo.webUrl) {
      return fileInfo.webUrl;
    }

    // Fallback: download URL
    if (fileInfo['@microsoft.graph.downloadUrl']) {
      return fileInfo['@microsoft.graph.downloadUrl'];
    }

    throw new Error('Video URL alınamadı');
  } catch (error) {
    console.error('Video yükleme hatası:', error);
    throw error;
  }
};
