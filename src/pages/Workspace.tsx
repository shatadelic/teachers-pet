import { Box, Paper, Typography, TextField, Button, Stack, DialogActions, Alert, Snackbar, CircularProgress } from '@mui/material';
import { DataGrid, GridCellModes, GridCellEditStopReasons } from '@mui/x-data-grid';
import type { 
  GridColDef, 
  GridRowsProp, 
  GridRowId,
  GridCellModesModel,
  GridCellParams,
  GridColumnHeaderParams,
  GridCellEditStopParams,
  GridSingleSelectColDef
} from '@mui/x-data-grid';
import { useRef, useState, useMemo, useCallback } from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import ArrowDropDownCircleIcon from '@mui/icons-material/ArrowDropDownCircle';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { analyzeInstructions, generateColumnOptions } from '../services/llmService';

// Определяем типы для метрик
type MetricType = 'text' | 'number' | 'select';

interface MetricColumn extends Omit<GridColDef, 'type'> {
  type: MetricType;
  valueOptions?: string[];
  align?: 'left' | 'right' | 'center';
  headerAlign?: 'left' | 'right' | 'center';
}

const defaultColumnTypes: Record<string, MetricType> = {
  name: 'text',
  sex: 'select',
  strengths: 'text',
  growthPoints: 'text',
  comment: 'text',
};

const defaultColumnOrder = [
  'name',
  'sex',
  'strengths',
  'growthPoints',
  'comment',
];

// Словарь для соответствия field и headerName
const columnHeaderNames: Record<string, string> = {
  name: 'Имя',
  sex: 'Пол',
  strengths: 'Сильные стороны',
  growthPoints: 'Точки роста',
  comment: 'Комментарий',
};

const defaultRows: GridRowsProp = [
  // Создаем новую строку с пустыми значениями для всех столбцов в defaultColumnOrder
  defaultColumnOrder.reduce((acc: any, field: string) => ({ ...acc, [field]: '' }), { id: Date.now() }),
];

/**
 * Компонент Workspace представляет собой основное рабочее пространство приложения.
 * Он включает в себя три основных секции:
 * 1. Инструкции и примеры для отчёта
 * 2. Таблица учеников и метрик
 * 3. Генерация и предпросмотр репорта
 */
const Workspace = () => {
  const [requirements, setRequirements] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  /**
   * Обработчик изменения файла с валидацией и обработкой ошибок
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Валидация размера файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFileError('Размер файла не должен превышать 5MB');
      return;
    }

    // Валидация типа файла
    if (!file.name.endsWith('.txt')) {
      setFileError('Поддерживаются только .txt файлы');
      return;
    }

    setIsLoading(true);
    setFileError(null);

    try {
      const text = await readFileContent(file);
      setRequirements(text);
      setSuccess('Файл успешно загружен');
    } catch (err) {
      setFileError('Ошибка при чтении файла');
      console.error('File reading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Вспомогательная функция для чтения содержимого файла
   */
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string') {
          resolve(content);
        } else {
          reject(new Error('Не удалось прочитать содержимое файла'));
        }
      };
      reader.onerror = () => reject(new Error('Ошибка при чтении файла'));
      reader.readAsText(file);
    });
  };

  const handleClear = () => setRequirements('');

  const [rows, setRows] = useState<GridRowsProp>(defaultRows);
  const [columnTypes, setColumnTypes] = useState<Record<string, MetricType>>(defaultColumnTypes);
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnOrder);
  const [selectedColumnField, setSelectedColumnField] = useState<string | null>(null);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({}); // Состояние для хранения пользовательских ширин столбцов
  const [isTableExpanded, setIsTableExpanded] = useState(false); // Состояние для разворачивания таблицы

  const [openClearDialog, setOpenClearDialog] = useState(false); // Состояние для диалога очистки таблицы
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false); // Состояние для диалога удаления столбца

  const [cellModesModel, setCellModesModel] = useState<GridCellModesModel>({});
  const [activeCell, setActiveCell] = useState<{ id: GridRowId; field: string } | null>(null); // Состояние для отслеживания активной ячейки

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Оптимизированная функция для обновления строк
   * Использует мемоизацию для предотвращения лишних ререндеров
   */
  const updateRows = useCallback((updater: (prev: GridRowsProp) => GridRowsProp) => {
    setRows(prev => {
      const newRows = updater(prev);
      // Проверяем, действительно ли изменились данные
      if (JSON.stringify(prev) === JSON.stringify(newRows)) {
        return prev;
      }
      return newRows;
    });
  }, []);


  // Обновляем существующие функции с использованием оптимизированных версий
  const handleAddRow = useCallback(() => {
    try {
      const newRow = columnOrder.reduce((acc, field) => ({ ...acc, [field]: '' }), { id: Date.now() });
      updateRows(prev => [...prev, newRow]);
      setSuccess('Строка успешно добавлена');
    } catch (err) {
      setError('Ошибка при добавлении строки');
    }
  }, [columnOrder, updateRows]);


  const handleClearTable = () => setRows([]);

  const getNextMetricField = () => {
    // Находим максимальный номер существующей метрики, если они есть
    const existingMetricNumbers = Object.keys(columnTypes)
      .map(field => field.startsWith('metric') ? parseInt(field.replace('metric', ''), 10) : NaN)
      .filter(num => !isNaN(num));

    const nextNumber = existingMetricNumbers.length > 0 ? Math.max(...existingMetricNumbers) + 1 : 1;
    return `metric${nextNumber}`;
  };

  const handleAddColumn = (position: 'left' | 'right') => {
    const newField = getNextMetricField();

    // 1. Update rows
    setRows(prev => prev.map(row => ({ ...row, [newField]: '' })));

    // 2. Update columnTypes
    setColumnTypes(prev => ({ ...prev, [newField]: 'text' }));

    // 3. Update metricOptions
    setMetricOptions(prev => ({ ...prev, [newField]: [] }));

    // 4. Update columnOrder
    setColumnOrder(prev => {
      const currentMetrics = [...prev];
      const selectedIndex = selectedColumnField ? currentMetrics.indexOf(selectedColumnField) : -1;

      if (selectedIndex !== -1) {
        // Column is selected, insert relative to selected column
        const newMetricOrder = [...currentMetrics];
        if (position === 'right') {
          newMetricOrder.splice(selectedIndex + 1, 0, newField);
        } else { // position === 'left'
          newMetricOrder.splice(selectedIndex, 0, newField);
        }
        return newMetricOrder;
      } else {
        // No column selected, add to end (or beginning for 'left' if preferred, but end is simpler for now)
        // Let's stick to adding to the end if no column is selected for simplicity.
        return [...currentMetrics, newField];
      }
    });

    console.log('Added new metric:', newField, 'at position:', position);
  };

  const handleAddColumnRight = () => handleAddColumn('right');
  const handleAddColumnLeft = () => handleAddColumn('left');


  const handleDeleteSelectedMetric = () => {
    if (selectedColumnField) {
      const fieldToDelete = selectedColumnField;

      // 1. Update rows - remove data for the deleted field
      setRows(prev => prev.map(row => {
        const { [fieldToDelete]: _, ...rest } = row;
        return rest;
      }));

      // 2. Update columnTypes - remove the field
      setColumnTypes(prev => {
        const { [fieldToDelete]: _, ...rest } = prev;
        return rest;
      });

      // 3. Update metricOptions - remove the field
      setMetricOptions(prev => {
        const { [fieldToDelete]: _, ...rest } = prev;
        return rest;
      });

      // 4. Update columnOrder - remove the field
      setColumnOrder(prev => prev.filter(field => field !== fieldToDelete));

      // 5. Reset selected column
      setSelectedColumnField(null);

      console.log('Deleted column:', fieldToDelete);
    } else {
      console.log('No column selected for deletion.');
    }
  };

  // Функции для диалога очистки таблицы
  const handleOpenClearDialog = () => setOpenClearDialog(true);
  const handleCloseClearDialog = () => setOpenClearDialog(false);
  const handleConfirmClearTable = () => {
    handleClearTable(); // Вызываем оригинальную функцию очистки
    handleCloseClearDialog();
  };

  // Функции для диалога удаления столбца
  const handleOpenDeleteDialog = () => {
    if (selectedColumnField && selectedColumnField.startsWith('metric')) {
      setOpenDeleteDialog(true);
    }
  };
  const handleCloseDeleteDialog = () => setOpenDeleteDialog(false);
  const handleConfirmDeleteSelectedMetric = () => {
    handleDeleteSelectedMetric(); // Вызываем оригинальную функцию удаления
    handleCloseDeleteDialog();
  };

  // --- Editable metric headers ---
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const [metricHeaderValue, setMetricHeaderValue] = useState('');

  const handleHeaderDoubleClick = (field: string, headerName: string) => {
    setEditingMetric(field);
    setMetricHeaderValue(headerName);
  };

  const handleHeaderInputBlur = () => {
    if (editingMetric) {
      setEditingMetric(null);
    }
  };

  const handleHeaderInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleHeaderInputBlur();
    }
  };

  // --- Типы метрик ---
  const [typeMenuAnchor, setTypeMenuAnchor] = useState<null | HTMLElement>(null);
  const [typeMenuField, setTypeMenuField] = useState<string | null>(null);

  // Состояние для управления диалогом редактирования опций
  const [openOptionsDialog, setOpenOptionsDialog] = useState(false);
  const [currentMetricField, setCurrentMetricField] = useState<string | null>(null);
  const [currentMetricOptions, setCurrentMetricOptions] = useState<string[]>([]);
  const [newOptionText, setNewOptionText] = useState('');

  const [metricOptions, setMetricOptions] = useState<Record<string, string[]>>({
    name: [],
    sex: ['муж', 'жен'], // Добавляем дефолтные опции для пола
    strengths: [],
    growthPoints: [],
    comment: [],
  });

  const handleTypeMenuOpen = (event: React.MouseEvent<HTMLElement>, field: string) => {
    setTypeMenuAnchor(event.currentTarget);
    setTypeMenuField(field);

    // Если метрика уже типа 'select', подготавливаем данные для диалога опций
    if (columnTypes[field] === 'select') {
      setCurrentMetricField(field);
      setCurrentMetricOptions(metricOptions[field] || []);
    } else {
      setCurrentMetricField(null);
      setCurrentMetricOptions([]);
    }
  };
  const handleTypeMenuClose = () => {
    setTypeMenuAnchor(null);
    setTypeMenuField(null);
    setCurrentMetricField(null); // Сбрасываем текущее поле при закрытии меню типа
    setCurrentMetricOptions([]);
    setNewOptionText(''); // Сбрасываем ввод новой опции при закрытии меню
  };
  const handleTypeChange = (type: MetricType) => {
    if (!typeMenuField) return;

    try {
      // Проверяем существующие значения при смене типа
      const currentValues = rows.map(row => row[typeMenuField]);
      const invalidValues = currentValues.filter(value => !validateCellValue(value, type));

      if (invalidValues.length > 0) {
        setError(`Некоторые значения не соответствуют новому типу "${type}"`);
        return;
      }

      setColumnTypes(prev => ({ ...prev, [typeMenuField]: type }));
      handleTypeMenuClose();
      
      if (type === 'select') {
        setCurrentMetricField(typeMenuField);
        setOpenOptionsDialog(true);
      }
      
      setSuccess('Тип столбца успешно изменен');
    } catch (err) {
      setError('Ошибка при изменении типа столбца');
    }
  };

  // Функция для получения headerName по field
  const getMetricHeaderName = (field: string | null) => {
    if (!field) return '';
    return columnHeaderNames[field] || field; // Используем словарь для получения headerName
  };

  const handleDeleteOption = (index: number) => {
    setCurrentMetricOptions(prev => prev.filter((_, i) => i !== index));
  };

  // В useMemo обновляем определение колонок
  const memoizedColumns = useMemo(() => {
    console.log('Recalculating memoizedColumns...', { columnTypes, metricOptions, columnHeaderNames, columnOrder, columnWidths });
    const columns: GridColDef[] = [];

    columnOrder.forEach(field => {
      const columnType = columnTypes[field as keyof typeof columnTypes];
      const currentHeaderName = columnHeaderNames[field] || field;

      const baseColumn: GridColDef = {
        field,
        headerName: currentHeaderName,
        width: columnWidths[field] || ((field === 'name' || field === 'recommendation') ? 200 : 160), // Используем сохраненную ширину, если есть
        editable: true,
        minWidth: 80, // Устанавливаем минимальную ширину ячейки в 80px (около 6-8 символов)
        disableColumnMenu: true,
        sortable: false,
        renderHeader: () => {
          const currentHeaderName = columnHeaderNames[field] || field;
          const columnType = columnTypes[field as keyof typeof columnTypes];

          return (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {editingMetric === field ? (
                <input
                  autoFocus
                  value={metricHeaderValue}
                  onChange={e => setMetricHeaderValue(e.target.value)}
                  onBlur={handleHeaderInputBlur}
                  onKeyDown={handleHeaderInputKeyDown}
                  style={{ fontSize: 14, width: '90%', padding: 2 }}
                />
              ) : (
                <>
                  <span
                    style={{ cursor: 'pointer', fontWeight: 500, whiteSpace: 'normal', overflowWrap: 'break-word' }}
                    onDoubleClick={() => handleHeaderDoubleClick(field, currentHeaderName)}
                    title="Двойной клик — переименовать колонку"
                  >
                    {currentHeaderName}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 'auto' }}>
                    {columnType === 'number' && (
                      <FormatListNumberedIcon
                        fontSize="small"
                        sx={{ cursor: 'pointer', color: '#b0b0b0', p: 0.2 }}
                        onClick={e => handleTypeMenuOpen(e as any, field)}
                        titleAccess="Настроить тип столбца (Число)"
                      />
                    )}
                    {columnType === 'select' && (
                      <ArrowDropDownCircleIcon
                        fontSize="small"
                        sx={{ cursor: 'pointer', color: '#b0b0b0', p: 0.2 }}
                        onClick={e => handleTypeMenuOpen(e as any, field)}
                        titleAccess="Настроить тип столбца (Выпадающий список)"
                      />
                    )}
                    {columnType === 'text' && (
                      <TextFieldsIcon
                        fontSize="small"
                        sx={{ cursor: 'pointer', color: '#b0b0b0', p: 0.2 }}
                        onClick={e => handleTypeMenuOpen(e as any, field)}
                        titleAccess="Настроить тип столбца (Текст)"
                      />
                    )}
                  </span>
                </>
              )}
            </span>
          );
        },
      };

      // Добавляем тип и valueOptions
      if (columnType === 'select') {
        const selectColumn: GridSingleSelectColDef = {
          ...baseColumn,
          type: 'singleSelect',
          valueOptions: metricOptions[field] || [],
        };
        columns.push(selectColumn);
      } else if (columnType === 'number') {
        columns.push({
          ...baseColumn,
          type: 'number',
          align: 'center',
          headerAlign: 'center',
        });
      } else {
        columns.push({
          ...baseColumn,
          type: 'string',
        });
      }
    });

    return columns;
  }, [editingMetric, metricHeaderValue, columnTypes, metricOptions, columnHeaderNames, handleHeaderDoubleClick, handleTypeMenuOpen, columnOrder, columnWidths]);

  const handleColumnHeaderClick = (params: GridColumnHeaderParams) => {
    setSelectedColumnField(params.field);
    console.log('Column selected:', params.field);
  };

  // Функция для валидации данных ячейки
  const validateCellValue = (value: any, type: MetricType, field?: string): boolean => {
    if (value === null || value === undefined) return true;
    
    switch (type) {
      case 'number':
        return !isNaN(Number(value)) && Number(value) >= 0;
      case 'select':
        return field ? (metricOptions[field]?.includes(value) ?? true) : true;
      default:
        return true;
    }
  };

  // Обновляем processRowUpdate с валидацией
  const processRowUpdate = (newRow: any, oldRow: any) => {
    try {
      const field = Object.keys(newRow).find(key => newRow[key] !== oldRow[key]);
      if (!field) return oldRow;

      const columnType = columnTypes[field as keyof typeof columnTypes];
      const newValue = newRow[field];

      if (!validateCellValue(newValue, columnType)) {
        setError(`Некорректное значение для поля "${columnHeaderNames[field] || field}"`);
        return oldRow;
      }

      setRows(prev => prev.map(row => row.id === newRow.id ? { ...row, ...newRow } : row));
      setSuccess('Данные успешно обновлены');
      return newRow;
    } catch (err) {
      setError('Ошибка при обновлении данных');
      return oldRow;
    }
  };

  // Добавляем обработчики для уведомлений
  const handleCloseError = () => setError(null);
  const handleCloseSuccess = () => setSuccess(null);

  const handleCellClick = (params: GridCellParams) => {
    // Если кликнули по той же ячейке, ничего не делаем
    if (activeCell?.id === params.id && activeCell?.field === params.field) {
      return;
    }

    const field = params.field as string;
    const columnType = columnTypes[field as keyof typeof columnTypes];

    // Если это ячейка типа 'select' и опций нет, открываем диалог редактирования опций
    if (columnType === 'select' && (!metricOptions[field] || metricOptions[field].length === 0)) {
      setCurrentMetricField(field);
      setCurrentMetricOptions(metricOptions[field] || []);
      setOpenOptionsDialog(true);
      return; // Прерываем выполнение, не переключаем в режим редактирования
    }

    let newCellModesModel: GridCellModesModel = { ...cellModesModel };

    // Если есть предыдущая активная ячейка, переводим ее в режим просмотра
    if (activeCell) {
      newCellModesModel = {
        ...newCellModesModel,
        [activeCell.id]: {
          ...(newCellModesModel[activeCell.id] || {}),
          [activeCell.field]: { mode: GridCellModes.View },
        },
      };
    }

    // Переводим новую ячейку в режим редактирования
    newCellModesModel = {
      ...newCellModesModel,
      [params.id]: {
        ...(newCellModesModel[params.id] || {}),
        [params.field]: { mode: GridCellModes.Edit },
      },
    };

    setCellModesModel(newCellModesModel);
    setActiveCell({ id: params.id, field: params.field }); // Устанавливаем новую активную ячейку
  };

  const handleCellKeyDown = (params: GridCellParams, event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      const newCellModesModel: GridCellModesModel = {
        ...cellModesModel,
        [params.id]: {
          ...(cellModesModel[params.id] || {}),
          [params.field]: {
            mode: GridCellModes.View
          },
        },
      };
      setCellModesModel(newCellModesModel);
    }
  };

  // Обработчик события окончания редактирования ячейки
  const handleCellEditStop = (params: GridCellEditStopParams) => {
    // Если редактирование остановилось из-за потери фокуса (например, клик вне ячейки)
    // или по нажатию Escape, переводим ячейку обратно в режим просмотра.
    if (params.reason === GridCellEditStopReasons.cellFocusOut || params.reason === GridCellEditStopReasons.escapeKeyDown) {
      setCellModesModel({
        ...cellModesModel,
        [params.id]: {
          ...(cellModesModel[params.id] || {}),
          [params.field]: { mode: GridCellModes.View },
        },
      });
      // Также сбрасываем активную ячейку, если она совпадает
      if (activeCell?.id === params.id && activeCell?.field === params.field) {
        setActiveCell(null);
      }
    }
    // Для других причин (например, Enter) DataGrid сам обработает переход,
    // и наш handleCellKeyDown уже установит режим View.
  };

  // Обработчик изменения размера столбца
  const handleColumnResize = (params: any) => {
    console.log('Column resize event fired:', params);
    setColumnWidths(prev => ({
      ...prev,
      [params.field]: params.width,
    }));
    console.log('columnWidths after resize:', { ...columnWidths, [params.field]: params.width });
  };

  // Функция для генерации столбцов из инструкций с помощью LLM
  const handleGenerateColumnsFromInstructions = async () => {
    if (!requirements) {
      setError('Пожалуйста, введите инструкции перед генерацией столбцов');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Получаем предложения по столбцам от LLM
      const columnSuggestions = await analyzeInstructions(requirements);

      let currentRows = [...rows];
      let currentColumnTypes = { ...columnTypes };
      let currentMetricOptions = { ...metricOptions };
      let currentColumnOrder = [...columnOrder];

      // Обрабатываем каждое предложение
      for (const suggestion of columnSuggestions) {
        const field = suggestion.field;
        
        // Проверяем, не существует ли столбец уже
        if (!currentColumnOrder.includes(field)) {
          // Добавляем данные в строки
          currentRows = currentRows.map(row => ({ ...row, [field]: '' }));
          
          // Обновляем типы столбцов
          currentColumnTypes = { ...currentColumnTypes, [field]: suggestion.type };
          
          // Если это select, генерируем опции
          if (suggestion.type === 'select') {
            const options = await generateColumnOptions(suggestion);
            currentMetricOptions = { ...currentMetricOptions, [field]: options };
          } else {
            currentMetricOptions = { ...currentMetricOptions, [field]: [] };
          }
          
          // Обновляем порядок столбцов
          currentColumnOrder = [...currentColumnOrder, field];
          
          // Обновляем заголовки столбцов
          columnHeaderNames[field] = suggestion.headerName;
        }
      }

      // Применяем все изменения
      setRows(currentRows);
      setColumnTypes(currentColumnTypes);
      setMetricOptions(currentMetricOptions);
      setColumnOrder(currentColumnOrder);

      setSuccess('Столбцы успешно сгенерированы на основе инструкций!');
    } catch (err) {
      setError('Ошибка при генерации столбцов. Пожалуйста, проверьте инструкции и попробуйте снова.');
      console.error('Error generating columns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, mt: 2 }} role="main" aria-label="Рабочее пространство">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* PROMPT */}
        {!isTableExpanded && (
          <Box>
            <Paper sx={{ p: 2, minHeight: 250 }} role="region" aria-label="Инструкции и примеры">
              <Typography variant="h6" gutterBottom component="h2">
                Инструкции и примеры для отчёта
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Здесь вы можете указать требования школы, критерии оценки, а также примеры хороших и неудачных отчётов. Это поможет системе создавать более точные и полезные репорты для ваших учеников.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Button 
                  variant="contained" 
                  component="label" 
                  size="small"
                  aria-label="Загрузить файл с инструкциями"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    'Загрузить файл'
                  )}
                  <input
                    type="file"
                    accept=".txt"
                    hidden
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    aria-label="Выберите файл с инструкциями"
                  />
                </Button>
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  size="small" 
                  onClick={handleClear} 
                  disabled={!requirements || isLoading}
                  aria-label="Очистить инструкции"
                >
                  Очистить
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleGenerateColumnsFromInstructions}
                  disabled={isLoading || !requirements} // Отключена, если нет инструкций или идет загрузка
                  aria-label="Сгенерировать столбцы по инструкциям"
                >
                  Сгенерировать столбцы по инструкциям
                </Button>
              </Stack>
              {fileError && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {fileError}
                </Alert>
              )}
              <TextField
                label="Инструкции и примеры"
                multiline
                minRows={6}
                fullWidth
                value={requirements}
                onChange={e => setRequirements(e.target.value)}
                placeholder="Введите или вставьте инструкции, требования, примеры..."
                variant="outlined"
                aria-label="Поле для ввода инструкций"
                disabled={isLoading}
              />
            </Paper>
          </Box>
        )}
        {/* TABLE */}
        <Box>
          <Paper sx={{ p: 2, minHeight: 250 }} role="region" aria-label="Таблица учеников и метрик">
            <Typography variant="h6" gutterBottom component="h2">
              Таблица учеников и метрик
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Заполните эту таблицу данными об учениках и измеряемых показателях (метриках). Информация из этой таблицы будет использована для автоматической генерации персонализированных отчетов в разделе ниже.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Одиночный клик по ячейке — редактировать значение. Двойной клик по заголовку — переименовать столбец. Клик по иконке типа в заголовке — изменить тип столбца. Используйте кнопки выше для добавления учеников и столбцов. Двойной клик по строке — удалить ученика. Выберите столбец, кликнув по заголовку, и используйте кнопку для удаления выбранного столбца.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Stack direction="row" spacing={1}>
                <Button 
                  variant="contained" 
                  size="small" 
                  onClick={handleAddRow}
                  aria-label="Добавить нового ученика"
                >
                  Добавить ученика
                </Button>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={handleAddColumnRight}
                  aria-label="Добавить столбец справа от выбранного"
                >
                  Добавить столбец справа
                </Button>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={handleAddColumnLeft}
                  aria-label="Добавить столбец слева от выбранного"
                >
                  Добавить столбец слева
                </Button>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="text"
                  color="secondary"
                  size="small"
                  onClick={handleOpenClearDialog}
                  disabled={rows.length === 0}
                  aria-label="Очистить таблицу"
                >
                  Очистить таблицу
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={handleOpenDeleteDialog}
                  disabled={!selectedColumnField}
                  aria-label="Удалить выбранный столбец"
                >
                  Удалить выбранный столбец
                </Button>
              </Stack>
            </Box>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            </Stack>
            <Box sx={{
              height: isTableExpanded ? 'calc(100vh - 150px)' : 400, // Динамическая высота
              width: '100vw',
              minWidth: 900,
              maxWidth: '100%',
              transition: 'height 0.3s ease', // Плавное изменение высоты
            }}>
              <DataGrid
                columns={memoizedColumns}
                rows={rows as any[]}
                cellModesModel={cellModesModel}
                onCellClick={handleCellClick}
                onCellKeyDown={handleCellKeyDown}
                onCellEditStop={handleCellEditStop}
                onColumnResize={handleColumnResize}
                processRowUpdate={processRowUpdate}
                onProcessRowUpdateError={(error) => {
                  setError(`Ошибка при обновлении данных: ${error.message}`);
                }}
                disableRowSelectionOnClick
                hideFooter
                getRowId={row => row.id}
                aria-label="Таблица учеников"
                sx={{
                  fontSize: 14,
                  border: '1px solid #d0d7de',
                  boxShadow: 'none',
                  '& .MuiDataGrid-cell': {
                    borderBottom: '1px solid #e0e0e0',
                    borderRight: '1px solid #e0d0d0',
                    padding: '8px 16px',
                    borderLeft: 'none',
                    borderTop: 'none',
                    whiteSpace: 'normal',
                    lineHeight: 'inherit',
                    overflowWrap: 'break-word',
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    background: '#fff',
                    borderBottom: '1px solid #d0d7de',
                    minHeight: '50px',
                    maxHeight: 'unset !important',
                    height: 'unset !important',
                    '& .MuiDataGrid-columnHeader': {
                      background: 'transparent',
                      borderLeft: 'none',
                      borderRight: 'none',
                      padding: '0 8px',
                      whiteSpace: 'normal',
                      lineHeight: 'inherit',
                      overflowWrap: 'break-word',
                      minHeight: 'unset !important',
                      height: 'unset !important',
                      ...(selectedColumnField && {
                        [`&[data-field="${selectedColumnField}"]`]: {
                          backgroundColor: '#e8f0fe',
                        },
                      }),
                    },
                    '& .MuiDataGrid-columnHeader:last-child': {
                      borderRight: 'none',
                    },
                  },
                  '& .MuiDataGrid-row:hover': {
                    background: '#f0f6ff',
                  },
                  '& .MuiDataGrid-columnHeaderTitle': {
                    fontWeight: 500,
                  },
                  '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': {
                    outline: 'none',
                  },
                  '& .MuiDataGrid-columnHeader:hover': {
                    backgroundColor: '#e8f0fe',
                    transition: 'background-color 0.2s',
                  },
                  '& .MuiDataGrid-columnHeader--selected': {
                    backgroundColor: '#e8f0fe',
                    '& .MuiDataGrid-columnHeaderTitle': {
                      fontWeight: 600,
                    },
                  },
                  '& .MuiDataGrid-cell--selected': {
                    backgroundColor: '#f8f9fa',
                  },
                  '& .MuiDataGrid-columnHeader:hover + .MuiDataGrid-virtualScroller .MuiDataGrid-cell': {
                    backgroundColor: '#f8f9fa',
                  },
                  '& .MuiDataGrid-cell:not(:last-child)': {
                    borderRight: '1px solid #e0e0e0',
                  },
                  '& .MuiDataGrid-cellContent': {
                    padding: 0,
                  },
                  '& .MuiDataGrid-virtualScrollerContent > div:first-of-type .MuiDataGrid-cell': {
                    borderTop: 'none',
                  },
                }}
                onColumnHeaderClick={handleColumnHeaderClick}
              />
            </Box>
            {/* Меню выбора типа метрики */}
            <Menu
              anchorEl={typeMenuAnchor}
              open={Boolean(typeMenuAnchor)}
              onClose={handleTypeMenuClose}
            >
              <MenuItem onClick={() => handleTypeChange('text')}>
                <ListItemIcon><TextFieldsIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Свободный текст</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleTypeChange('number')}>
                <ListItemIcon><FormatListNumberedIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Число (например, 1–3)</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleTypeChange('select')}>
                <ListItemIcon><ArrowDropDownCircleIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Выпадающий список</ListItemText>
              </MenuItem>
            </Menu>
          </Paper>
        </Box>
        {/* Кнопка разворачивания/сворачивания таблицы */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          {!isTableExpanded ? (
            <Button variant="outlined" onClick={() => setIsTableExpanded(true)}>
              Открыть таблицу на весь экран
            </Button>
          ) : (
            <Button variant="outlined" onClick={() => setIsTableExpanded(false)}>
              Свернуть таблицу
            </Button>
          )}
        </Box>
        {/* GENERATION */}
        {!isTableExpanded && (
          <Box>
            <Paper sx={{ p: 2, minHeight: 250, mt: 2 }} role="region" aria-label="Генерация и предпросмотр репорта">
              <Typography variant="h6" gutterBottom component="h2">
                Генерация и предпросмотр репорта
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Здесь появится редактор в стиле Word и предпросмотр для выбранного ученика.
              </Typography>
              <Paper variant="outlined" sx={{ p: 1, mb: 1, bgcolor: '#f9f9f9' }} role="note">
                Пример: Иванов Иван — демонстрирует хорошие навыки анализа, но нуждается в развитии рефлексии...
              </Paper>
              {/* Здесь будет WYSIWYG редактор и кнопки */}
              <Typography variant="caption" color="text.secondary">
                (Редактор и кнопки экспорта появятся здесь)
              </Typography>
            </Paper>
          </Box>
        )}
      </Box>

      {/* Диалог для редактирования опций выпадающего списка */}
      <Dialog 
        open={openOptionsDialog} 
        onClose={() => setOpenOptionsDialog(false)} 
        maxWidth="sm" 
        fullWidth
        aria-labelledby="options-dialog-title"
      >
        <DialogTitle id="options-dialog-title">
          {`Редактировать опции для метрики: ${getMetricHeaderName(currentMetricField)}`}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {currentMetricOptions.map((option, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  value={option}
                  size="small"
                  fullWidth
                  onChange={(e) => {
                    const newOptions = [...currentMetricOptions];
                    newOptions[index] = e.target.value;
                    setCurrentMetricOptions(newOptions);
                  }}
                />
                <IconButton size="small" onClick={() => handleDeleteOption(index)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                label="Новая опция"
                size="small"
                fullWidth
                value={newOptionText}
                onChange={e => setNewOptionText(e.target.value)}
              />
              <Button variant="contained" size="small" disabled={!newOptionText} onClick={() => {
                setCurrentMetricOptions(prev => [...prev, newOptionText]);
                setNewOptionText('');
              }}>Добавить</Button>
            </Box>
          </Stack>
          <DialogActions>
            <Button onClick={() => setOpenOptionsDialog(false)}>Отмена</Button>
            <Button variant="contained" onClick={() => {
              if (currentMetricField) {
                setMetricOptions(prev => ({
                  ...prev,
                  [currentMetricField]: currentMetricOptions,
                }));
                // Обновление columns теперь происходит через useMemo при изменении metricOptions
              }
              setOpenOptionsDialog(false);
            }}>Сохранить</Button>
          </DialogActions>
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения очистки таблицы */}
      <Dialog
        open={openClearDialog}
        onClose={handleCloseClearDialog}
        aria-labelledby="clear-dialog-title"
        aria-describedby="clear-dialog-description"
      >
        <DialogTitle id="clear-dialog-title">Подтверждение очистки</DialogTitle>
        <DialogContent>
          <Typography id="clear-dialog-description" variant="body1">
            Вы уверены, что хотите полностью очистить таблицу со всеми учениками и их данными?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseClearDialog} color="primary">Отмена</Button>
          <Button onClick={handleConfirmClearTable} color="error" autoFocus>Очистить</Button>
        </DialogActions>
      </Dialog>

      {/* Диалог подтверждения удаления столбца */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography id="delete-dialog-description" variant="body1">
            Вы уверены, что хотите удалить выбранный столбец "{getMetricHeaderName(selectedColumnField)}" и все данные в нём?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">Отмена</Button>
          <Button onClick={handleConfirmDeleteSelectedMetric} color="error" autoFocus>Удалить</Button>
        </DialogActions>
      </Dialog>

      {/* Добавляем уведомления об ошибках и успехе */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={handleCloseError}
        role="alert"
        aria-live="assertive"
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!success} 
        autoHideDuration={3000} 
        onClose={handleCloseSuccess}
        role="status"
        aria-live="polite"
      >
        <Alert onClose={handleCloseSuccess} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Workspace; 