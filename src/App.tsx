import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChefHat, Dices, Plus, X, Utensils, Clock, Flame, Sparkles, Loader2, RefreshCw, Tag, Heart, Camera } from 'lucide-react';
import { generateMealPlan, MealPlan, identifyIngredientsFromImage } from './services/gemini';

const INGREDIENT_CATEGORIES = [
  { name: "🥩 肉蛋海鲜", items: ["鸡蛋", "鸡胸肉", "牛肉", "猪肉馅", "虾仁", "三文鱼", "培根", "香肠"] },
  { name: "🥬 蔬菜菌菇", items: ["西红柿", "土豆", "洋葱", "大蒜", "西兰花", "蘑菇", "菠菜", "胡萝卜", "彩椒", "西葫芦"] },
  { name: "🍚 主食豆制品", items: ["米饭", "面条", "意大利面", "面包", "豆腐", "年糕"] },
  { name: "🧂 调料其他", items: ["芝士", "牛奶", "泡菜", "咖喱块", "椰奶", "老干妈", "葱姜蒜"] }
];

const CUISINE_STYLES = ["🎲 随机发挥", "🥢 中式家常", "🌶️ 川湘麻辣", "🥩 精致西餐", "🍣 日式料理", "🌴 东南亚风味", "🥗 减脂健康"];
const COOKING_TIMES = ["⏱️ 不限时间", "⚡ 15分钟快手", "⏳ 30分钟搞定", "🍲 周末慢炖"];

export default function App() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [cuisineStyle, setCuisineStyle] = useState(CUISINE_STYLES[0]);
  const [cookingTime, setCookingTime] = useState(COOKING_TIMES[0]);
  const [isCooking, setIsCooking] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDrawingBlindBox, setIsDrawingBlindBox] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleIngredient = (ing: string) => {
    if (ingredients.includes(ing)) {
      setIngredients(ingredients.filter(i => i !== ing));
    } else {
      setIngredients([...ingredients, ing]);
    }
  };

  const handleAddIngredient = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients([...ingredients, trimmed]);
      setInputValue('');
    }
  };

  const drawBlindBox = () => {
    setIsDrawingBlindBox(true);
    setTimeout(() => {
      const allItems = INGREDIENT_CATEGORIES.flatMap(c => c.items);
      const shuffled = [...allItems].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, Math.floor(Math.random() * 4) + 4); // 4 to 7 ingredients
      
      const newIngredients = [...new Set([...ingredients, ...selected])];
      setIngredients(newIngredients);
      setIsDrawingBlindBox(false);
    }, 800);
  };

  const clearIngredients = () => {
    setIngredients([]);
    setMealPlan(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsIdentifying(true);
    setError(null);

    try {
      // Resize image before sending to API to speed up and prevent payload limits
      const { base64Data, mimeType } = await new Promise<{base64Data: string, mimeType: string}>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDimension = 800; // Resize to max 800px

            if (width > height && width > maxDimension) {
              height *= maxDimension / width;
              width = maxDimension;
            } else if (height > maxDimension) {
              width *= maxDimension / height;
              height = maxDimension;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error("Failed to get canvas context"));
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve({
              base64Data: dataUrl.split(',')[1],
              mimeType: 'image/jpeg'
            });
          };
          img.onerror = () => reject(new Error("Failed to load image"));
          img.src = event.target?.result as string;
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const identified = await identifyIngredientsFromImage(base64Data, mimeType);
      if (identified && identified.length > 0) {
        setIngredients(prev => [...new Set([...prev, ...identified])]);
      } else {
        setError("未能从图片中识别出食材，请换一张图片试试。");
      }
    } catch (err) {
      console.error(err);
      setError("图片识别失败，请重试。");
    } finally {
      setIsIdentifying(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const cook = async () => {
    if (ingredients.length === 0) return;
    setIsCooking(true);
    setError(null);
    try {
      const result = await generateMealPlan(ingredients, cuisineStyle, cookingTime);
      setMealPlan(result);
    } catch (err: any) {
      console.error(err);
      setError("大厨把菜烧糊了！请重试。");
    } finally {
      setIsCooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-stone-800 font-sans selection:bg-orange-200 pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-2 rounded-xl text-white shadow-md shadow-orange-500/20">
              <ChefHat size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900">冰箱盲盒大厨 <span className="text-orange-500 text-sm font-normal bg-orange-50 px-2 py-0.5 rounded-full ml-2">Pro</span></h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section 1: Selected Ingredients */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-stone-800">
                <Sparkles className="text-orange-500" size={20} />
                已选食材 ({ingredients.length})
              </h2>
              {ingredients.length > 0 && (
                <button 
                  onClick={clearIngredients}
                  className="text-sm text-stone-400 hover:text-stone-600 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw size={14} /> 清空
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 min-h-[80px] p-4 bg-stone-50 rounded-2xl border border-stone-100 mb-4">
              <AnimatePresence>
                {ingredients.length === 0 && !isDrawingBlindBox && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-stone-400 text-sm w-full text-center my-auto"
                  >
                    冰箱空空如也，请从下方挑选或输入食材。
                  </motion.p>
                )}
                {ingredients.map((ing) => (
                  <motion.span
                    key={ing}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    layout
                    className="inline-flex items-center gap-1.5 bg-white border border-orange-200 text-orange-700 px-3 py-1.5 rounded-xl text-sm font-medium shadow-sm"
                  >
                    {ing}
                    <button 
                      onClick={() => toggleIngredient(ing)}
                      className="text-orange-400 hover:text-orange-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </motion.span>
                ))}
                {isDrawingBlindBox && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="w-full flex justify-center py-2"
                  >
                    <Loader2 className="animate-spin text-orange-500" size={24} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <form onSubmit={handleAddIngredient} className="flex gap-2 mb-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="手动输入其他食材..."
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
              />
              <button 
                type="submit"
                disabled={!inputValue.trim()}
                className="bg-stone-800 text-white p-2.5 rounded-xl hover:bg-stone-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={20} />
              </button>
            </form>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={drawBlindBox}
                disabled={isDrawingBlindBox || isCooking || isIdentifying}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 hover:from-orange-200 hover:to-amber-200 py-3 px-4 rounded-xl font-bold transition-all disabled:opacity-50 border border-orange-200 shadow-sm text-sm"
              >
                <Dices size={18} className={isDrawingBlindBox ? "animate-spin" : ""} />
                抽取盲盒
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isDrawingBlindBox || isCooking || isIdentifying}
                className="flex items-center justify-center gap-2 bg-stone-100 text-stone-700 hover:bg-stone-200 py-3 px-4 rounded-xl font-bold transition-all disabled:opacity-50 border border-stone-200 shadow-sm text-sm"
              >
                {isIdentifying ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
                {isIdentifying ? '识别中...' : '拍照/上传'}
              </button>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
              />
            </div>
          </div>

          {/* Section 2: Quick Add Pantry */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
            <h2 className="text-lg font-bold mb-4 text-stone-800">快捷挑选</h2>
            <div className="space-y-5">
              {INGREDIENT_CATEGORIES.map((category) => (
                <div key={category.name}>
                  <h3 className="text-sm font-semibold text-stone-500 mb-2">{category.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {category.items.map((item) => {
                      const isSelected = ingredients.includes(item);
                      return (
                        <button
                          key={item}
                          onClick={() => toggleIngredient(item)}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                            isSelected 
                              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 border-transparent' 
                              : 'bg-stone-50 text-stone-600 border border-stone-200 hover:border-orange-300 hover:bg-orange-50'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Preferences & Cook Button */}
          <div className="bg-stone-900 rounded-3xl p-6 shadow-lg text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-5 transform translate-x-4 -translate-y-4">
              <ChefHat size={120} />
            </div>
            <div className="relative z-10">
              <h2 className="text-lg font-bold mb-4 text-orange-400">烹饪偏好</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-stone-400 mb-2">菜系风格</label>
                  <select 
                    value={cuisineStyle}
                    onChange={(e) => setCuisineStyle(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {CUISINE_STYLES.map(style => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-400 mb-2">时间要求</label>
                  <select 
                    value={cookingTime}
                    onChange={(e) => setCookingTime(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {COOKING_TIMES.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={cook}
                disabled={ingredients.length === 0 || isCooking}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 py-4 px-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:shadow-none"
              >
                {isCooking ? <Loader2 className="animate-spin" size={24} /> : <Utensils size={24} />}
                {isCooking ? '大厨正在统筹安排...' : '生成专属餐饮安排！'}
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Recipe Output */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {isCooking ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full min-h-[600px] flex flex-col items-center justify-center bg-white rounded-3xl border border-stone-200 shadow-sm p-8 text-center"
              >
                <motion.div
                  animate={{ 
                    rotate: [0, 10, -10, 10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="bg-orange-50 p-8 rounded-full mb-6 relative"
                >
                  <div className="absolute inset-0 border-4 border-orange-200 rounded-full animate-ping opacity-20"></div>
                  <ChefHat size={64} className="text-orange-500" />
                </motion.div>
                <h3 className="text-xl font-bold mb-3 text-stone-800">大厨正在统筹菜单...</h3>
                <p className="text-stone-500 max-w-md">
                  正在根据你的食材（{ingredients.join('、')}），合理搭配荤素汤水，为你定制 {cookingTime} 的专属餐饮安排。
                </p>
                <div className="mt-8 flex gap-2">
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </motion.div>
            ) : error ? (
              <motion.div 
                key="error"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-red-50 text-red-600 p-8 rounded-3xl border border-red-100 text-center flex flex-col items-center justify-center min-h-[400px]"
              >
                <Flame size={48} className="mb-4 text-red-400" />
                <h3 className="text-xl font-bold mb-2">哎呀，厨房起火了！</h3>
                <p>{error}</p>
              </motion.div>
            ) : mealPlan ? (
              <motion.div 
                key="recipe"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-stone-200 shadow-xl shadow-stone-200/50 overflow-hidden"
              >
                {/* Recipe Header */}
                <div className="bg-stone-900 text-white p-8 md:p-10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                    <Utensils size={250} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {mealPlan.tags?.map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-1 bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2.5 py-1 rounded-md text-xs font-bold tracking-wide">
                          <Tag size={12} /> {tag}
                        </span>
                      ))}
                    </div>
                    
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-stone-300">
                      {mealPlan.title}
                    </h2>
                    <p className="text-stone-300 text-lg mb-8 max-w-2xl leading-relaxed">
                      {mealPlan.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-3 text-sm font-medium">
                      <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5">
                        <Clock size={18} className="text-orange-400" />
                        <div className="flex flex-col">
                          <span className="text-xs text-stone-400 leading-none mb-1">总准备</span>
                          <span className="leading-none">{mealPlan.prepTime}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5">
                        <Flame size={18} className="text-orange-400" />
                        <div className="flex flex-col">
                          <span className="text-xs text-stone-400 leading-none mb-1">总烹饪</span>
                          <span className="leading-none">{mealPlan.cookTime}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5">
                        <Sparkles size={18} className="text-orange-400" />
                        <div className="flex flex-col">
                          <span className="text-xs text-stone-400 leading-none mb-1">综合难度</span>
                          <span className="leading-none">{mealPlan.difficulty}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5">
                        <Heart size={18} className="text-orange-400" />
                        <div className="flex flex-col">
                          <span className="text-xs text-stone-400 leading-none mb-1">整体口味</span>
                          <span className="leading-none">{mealPlan.flavorProfile || '美味'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 md:p-10 space-y-8">
                  <h3 className="text-2xl font-bold text-stone-800 border-b-2 border-stone-100 pb-4">
                    菜单安排 ({mealPlan.dishes.length}道菜)
                  </h3>
                  
                  <div className="space-y-8">
                    {mealPlan.dishes.map((dish, idx) => (
                      <div key={idx} className="bg-stone-50 rounded-2xl p-6 md:p-8 border border-stone-100">
                        <h4 className="text-xl font-bold text-orange-600 mb-6 flex items-center gap-3">
                          <span className="bg-orange-100 text-orange-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">
                            {idx + 1}
                          </span>
                          {dish.dishName}
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                          <div className="md:col-span-4">
                            <h5 className="font-bold text-stone-700 mb-3 flex items-center gap-2">
                              使用食材
                            </h5>
                            <ul className="space-y-2">
                              {dish.ingredientsUsed.map((ing, i) => (
                                <li key={i} className="flex items-start gap-2 text-stone-600 text-sm">
                                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-200 text-orange-600 shrink-0 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-600"></div>
                                  </span>
                                  <span className="leading-relaxed">{ing}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="md:col-span-8">
                            <h5 className="font-bold text-stone-700 mb-3 flex items-center gap-2">
                              烹饪步骤
                            </h5>
                            <ol className="space-y-4">
                              {dish.instructions.map((step, i) => (
                                <li key={i} className="flex gap-3 text-sm">
                                  <span className="font-bold text-orange-400 shrink-0">{i + 1}.</span>
                                  <p className="text-stone-700 leading-relaxed">{step}</p>
                                </li>
                              ))}
                            </ol>
                            
                            {dish.chefTip && (
                              <div className="mt-6 bg-white border border-orange-100 rounded-xl p-4 shadow-sm">
                                <h6 className="font-bold text-orange-800 mb-1 text-sm flex items-center gap-1.5">
                                  <ChefHat size={14} /> 单品贴士
                                </h6>
                                <p className="text-orange-900/80 text-sm leading-relaxed">
                                  {dish.chefTip}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Overall Chef's Tip */}
                  <div className="mt-10 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200/60 rounded-2xl p-6 md:p-8 shadow-sm">
                    <h4 className="font-bold text-orange-800 mb-3 flex items-center gap-2 text-lg">
                      <ChefHat size={22} className="text-orange-500" />
                      大厨统筹秘籍
                    </h4>
                    <p className="text-orange-900/80 leading-relaxed">
                      {mealPlan.overallChefTip}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-full min-h-[600px] flex flex-col items-center justify-center bg-transparent border-2 border-dashed border-stone-200 rounded-3xl p-8 text-center"
              >
                <div className="bg-white p-6 rounded-full mb-6 shadow-sm border border-stone-100 text-stone-300">
                  <Utensils size={48} />
                </div>
                <h3 className="text-xl font-bold text-stone-700 mb-2">等待食材下锅</h3>
                <p className="text-stone-500 max-w-sm leading-relaxed">
                  在左侧挑选你现有的食材，设置好偏好，然后让人工智能大厨为你带来惊喜！
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
